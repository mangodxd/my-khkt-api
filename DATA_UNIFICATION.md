# Smart Muster Camera - Data Unification Documentation

**Date:** April 18, 2026 (Updated: Multiple Images & Threshold Optimization)  
**Status:** ✅ Data structure unified with multi-frame support and optimized confidence threshold

---

## Key Updates

### Confidence Threshold Optimization
- **Previous:** 0.1 (too low, causes face misidentification)
- **Current:** 0.4 (balanced accuracy with reliability)
- **Explanation:** Using cosine similarity (0-1 scale)
  - 0.1 = only 10% match needed → dangerous
  - 0.4 = 40% match required → safe, accurate
  - Can adjust in `config.json` if needed

### Multi-Frame Image Support  
- **Previous:** Only 1 image per session, extra images uploaded separately
- **Current:** All captured images sent together in single array
- **Benefits:**
  - Faster transmission (one request instead of N+1)
  - Better UI: Users can flip through multiple frames
  - More reliable (no partial upload risk)

---

## Overview

This document describes the unified data structure and API contracts used across the Smart Muster Camera system. All components (Flask API, Python Worker, Flutter App, Web UI) now use consistent field naming and data formats.

---

## Unified Naming Convention

**Convention:** `snake_case` for all API fields and database columns

- Database fields: `created_at`, `present_count`, `absent_count`, `present_names`, `absent_names`
- API responses: Same field names as database
- Flutter model: Uses camelCase internally (Dart convention) but maps from snake_case API JSON
- Web UI: Uses snake_case to match API directly

---

## Database Schema (SQLite)

### `attendance_sessions` Table
```sql
CREATE TABLE attendance_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL DEFAULT 'manual',           -- 'auto' or 'manual'
    total INTEGER NOT NULL DEFAULT 0,                 -- Total students
    present_count INTEGER NOT NULL DEFAULT 0,        -- Count of present students
    absent_count INTEGER NOT NULL DEFAULT 0,         -- Count of absent students
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))  -- Session timestamp
)
```

### `session_present` Table
```sql
CREATE TABLE session_present (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
    student_name TEXT NOT NULL                        -- Name of present student
)
```

### `session_absent` Table
```sql
CREATE TABLE session_absent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
    student_name TEXT NOT NULL                        -- Name of absent student
)
```

### `session_images` Table
```sql
CREATE TABLE session_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id),
    image_data TEXT NOT NULL,                         -- Base64-encoded image
    is_primary INTEGER NOT NULL DEFAULT 0             -- 1 for main image, 0 for extra
)
```

---

## API Contract

### Attendance Data Response Format

**Used by:** All GET endpoints  
**Example:** `GET /api/attendance`, `GET /api/attendance/history/{id}`

```json
{
  "id": 123,
  "source": "auto",
  "total": 45,
  "present_count": 43,
  "absent_count": 2,
  "present_names": ["Nguyễn Văn A", "Trần Thị B", "Lê Văn C"],
  "absent_names": ["Phạm Văn D", "Hoàng Thị E"],
  "images": [
    "data:image/webp;base64,UklGRiY...",  // Primary image (frame 1)
    "data:image/webp;base64,YnNkZW...",   // Secondary image (frame 2)
    "data:image/webp;base64,ajdmZE..."    // Tertiary image (frame N)
  ],
  "image": "data:image/webp;base64,UklGRiY...",  // First image (backward compatibility)
  "created_at": "2026-04-18T14:30:45.000Z"
}
```

**Field Descriptions:**
- `id` (number): Unique session identifier
- `source` (string): Source of check-in (`"auto"` from Python worker or `"manual"` from UI)
- `total` (number): Total number of students in the class
- `present_count` (number): Count of students marked present
- `absent_count` (number): Count of students marked absent
- `present_names` (array): List of names of students present
- `absent_names` (array): List of names of students absent
- `images` (array): Base64-encoded images of captured frames (WebP format), ordered by priority
  - First element (index 0): Primary/main image
  - Subsequent elements: Additional frames captured
- `image` (string|null): **Deprecated** - First image for backward compatibility, use `images[0]` instead
- `created_at` (string): ISO 8601 timestamp of when session was created

### History List Response

**Endpoint:** `GET /api/attendance/history?limit=20&offset=0`

```json
{
  "success": true,
  "data": [
    {
      "id": 124,
      "source": "manual",
      "total": 45,
      "present_count": 42,
      "absent_count": 3,
      "created_at": "2026-04-18T13:15:20.000Z"
    },
    // ... more records
  ]
}
```

---

## Python Worker -> API Contract

### Check-in Request Payload

**Endpoint:** `POST /api/attendance`

```json
{
  "source": "auto",
  "total": 45,
  "present_names": ["Nguyễn Văn A", "Trần Thị B"],
  "absent_names": ["Phạm Văn D", "Hoàng Thị E"],
  "images": [
    "UklGRiY...",  // Base64-encoded WebP image (frame 1 - primary)
    "YnNkZW...",   // Base64-encoded WebP image (frame 2)
    "ajdmZE..."    // Base64-encoded WebP image (frame N)
  ],
  "last_update": "2026-04-18 14:30:45"  // Informational only, server uses created_at
}
```

**Response:**
```json
{
  "success": true,
  "attendance_id": 123
}
```

### Image Upload (DEPRECATED)

**Endpoint:** `POST /api/attendance/upload_image`  
**Status:** ⚠️ **Deprecated** - Use `POST /api/attendance` with `images` array instead

```json
{
  "attendance_id": 123,
  "image": "UklGRiY...",  // Base64-encoded WebP image
  "is_primary": 0  // 0 for additional frames, 1 for main image
}
```

**Note:** This endpoint is still functional for backward compatibility, but new code should use the `images` array in the main attendance POST request.

---

## Flutter App Data Model

### AttendanceModel Class

Location: `app/lib/model/attendance_model.dart`

```dart
class AttendanceModel {
  final int id;
  final String source;
  final int total;
  final int presentCount;      // Maps from 'present_count'
  final int absentCount;       // Maps from 'absent_count'
  final List<String> presentNames;    // Maps from 'present_names'
  final List<String> absentNames;     // Maps from 'absent_names'
  final List<String> images;          // Maps from 'images' array
  final String? image;                // First image for backward compatibility
  final DateTime createdAt;    // Maps from 'created_at'

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    final images = List<String>.from(json["images"] ?? []);
    return AttendanceModel(
      id: json["id"] ?? 0,
      source: json["source"] ?? "manual",
      total: json["total"] ?? 0,
      presentCount: json["present_count"] ?? 0,
      absentCount: json["absent_count"] ?? 0,
      presentNames: List<String>.from(json["present_names"] ?? []),
      absentNames: List<String>.from(json["absent_names"] ?? []),
      images: images,
      image: images.isNotEmpty ? images[0] : json["image"],  // Backward compatibility
      createdAt: DateTime.parse(json["created_at"] ?? DateTime.now().toIso8601String()),
    );
  }
}
```

**Key Points:**
- Field names use camelCase (Dart convention)
- `fromJson()` correctly maps snake_case API fields
- `images` array: supports multiple captured frames
- `image` field: backward compatibility, automatically set to `images[0]`
- Each image in array is WebP format Base64-encoded

### AttendanceService Methods

Location: `app/lib/service/attendance_service.dart`

```dart
// Fetch latest attendance session
static Future<Map<String, dynamic>?> fetchLastAttendance()

// Fetch paginated history
static Future<List<Map<String, dynamic>>> fetchAttendanceHistory({
  int limit = 20,
  int offset = 0,
})

// Fetch details of specific session
static Future<Map<String, dynamic>?> fetchAttendanceDetails(int sessionId)
```

---

## Web UI Data Flow

### WebSocket Message Format

**Type:** `attendance_update`

```json
{
  "type": "attendance_update",
  "payload": {
    "id": 123,
    "source": "auto",
    "total": 45,
    "present_names": ["Nguyễn Văn A", "Trần Thị B"],
    "absent_names": ["Phạm Văn D", "Hoàng Thị E"],
    "image": "data:image/webp;base64,UklGRiY...",
    "created_at": "2026-04-18T14:30:45.000Z",
    "last_update": "2026-04-18T14:30:45.000Z"
  }
}
```

### UI State Management

File: `web-ui/js/ui.js`

```javascript
state = {
  present: [],   // List of present student names
  absent: [],    // List of absent student names
  view: 'present' // Current tab view
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART MUSTER CAMERA                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐                 ┌─────────────────────┐   │
│  │  Python Worker   │                 │   API Gateway       │   │
│  │  (FaceSystem.py) │                 │   (Node.js)         │   │
│  └────────┬─────────┘                 └────────┬────────────┘   │
│           │                                    │                 │
│           │ POST /api/attendance               │                 │
│           │ {source, total,                    │ GET /api/       │
│           │  present_names,                    │ attendance      │
│           │  absent_names, image}              │                 │
│           │                                    │                 │
│           └───────────────────────────────────>│                 │
│                                                │                 │
│                                                ├──> SQLite DB    │
│                                                │                 │
│                             ┌──────────────────┴──────┐           │
│                             │                         │           │
│              ┌──────────────▼──┐        ┌────────────▼──┐        │
│              │   Web UI        │        │  Flutter App  │        │
│              │  (JavaScript)   │        │  (Dart)       │        │
│              │                 │        │               │        │
│              │ GET /api/       │        │ GET /api/     │        │
│              │ attendance/     │        │ attendance    │        │
│              │ history         │        └───────────────┘        │
│              │                 │                                 │
│              │ WebSocket       │                                 │
│              │ (real-time)     │                                 │
│              └─────────────────┘                                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Field Mapping Summary

| Component | Field Name | Type | Source | Notes |
|-----------|------------|------|--------|-------|
| Database | `present_count` | int | database | Number of students present |
| API | `present_count` | int | database | Same as database |
| Python | `present_names` | array | face recognition | Names of recognized students |
| Flutter | `presentCount` | int | `present_count` API field | Camel case in Dart |
| Web UI | `present_count` | int | API response | Snake case in JavaScript |
| Database | `absent_names` | N/A | N/A | Stored in separate table |
| Python | `absent_names` | array | calculated | Derived from absent students |
| API | `absent_names` | array | session_absent table | Retrieved from database |
| Flutter | `absentNames` | array | `absent_names` API field | Camel case in Dart |
| Web UI | `absent_names` | array | API response | Snake case in JavaScript |

---

## Breaking Changes

### Recent Updates (April 18, 2026 - Phase 2)

#### Confidence Threshold Change
```javascript
// config.json
"face_recognition_threshold": 0.1   // ❌ Was too low (caused misidentification)
"face_recognition_threshold": 0.4   // ✅ Now: 40% minimum match required
```

**Impact:** 
- More accurate face recognition
- Fewer false positives (incorrect matches)
- Possibly slightly more false negatives (missed detections)
- Configurable in `config.json` if needs adjustment

#### Image Transmission Change
```javascript
// BEFORE - Multiple API calls
POST /api/attendance { image: "..." }           // Main image
POST /api/attendance/upload_image { image: ... } // Extra 1
POST /api/attendance/upload_image { image: ... } // Extra 2

// AFTER - Single API call
POST /api/attendance { images: ["...", "...", "..."] }  // All at once
```

**Benefits:**
- ✅ Faster (one request instead of N+1)
- ✅ Atomic operation (all-or-nothing)
- ✅ UI can display multiple frames
- ✅ No risk of partial uploads

#### Python Worker Changes
```python
# BEFORE
payload = {
    'image': imgs[0],  # Only first image
    ...
}
gateway.post_attendance(payload)

for img in imgs[1:]:
    gateway.upload_image(att_id, img)  # Upload rest separately

# AFTER
payload = {
    'images': imgs,  # All images at once
    ...
}
gateway.post_attendance(payload)
```

#### API Response Changes
```json
// BEFORE
{
  "image": "base64-string-or-null"
}

// AFTER
{
  "images": ["base64-string-1", "base64-string-2", ...],
  "image": "base64-string-1"  // Backward compatibility
}
```

#### Web UI Changes
```javascript
// BEFORE - Only showed one image
updateCameraView(mainImg)

// AFTER - Show all frames, user can click to switch
updateCameraView(imagesArray, fallbackMainImg)
```

### Previous Updates (April 18, 2026 - Phase 1)

#### Before (Incorrect Model)
```dart
class AttendanceModel {
  final String id;
  final int total;
  final int present;                    // ❌ Was a number
  final List<String> absent;            // ✓ Correct
  final String image;
  final DateTime createdAt;
}

// Mapping was incorrect:
id: json["_id"]           // ❌ Wrong key
present: json["present"]  // ❌ No such field in API
createdAt: json["createdAt"]  // ❌ Wrong format (API uses created_at)
```

#### After (Correct Model)
```dart
class AttendanceModel {
  final int id;
  final String source;                  // ✅ Added
  final int total;
  final int presentCount;               // ✅ Fixed: now maps to present_count
  final int absentCount;                // ✅ Added: present_count is a count, not names
  final List<String> presentNames;      // ✅ Added: the actual names
  final List<String> absentNames;       // ✅ Fixed: maps to absent_names
  final String? image;
  final DateTime createdAt;             // ✅ Fixed: maps to created_at
}
```

#### Service Method Changes

**Before:**
```dart
static Future<Map<String, dynamic>?> fetchLastAttendance() async {
  final url = Uri.parse("$baseUrl/attendance/last");  // ❌ Endpoint doesn't exist
  // ...
}
```

**After:**
```dart
static Future<Map<String, dynamic>?> fetchLastAttendance() async {
  final url = Uri.parse("$baseUrl/attendance");  // ✅ Correct endpoint
  // ...
}

// Added new methods for more flexibility
static Future<List<Map<String, dynamic>>> fetchAttendanceHistory({
  int limit = 20,
  int offset = 0,
})

static Future<Map<String, dynamic>?> fetchAttendanceDetails(int sessionId)
```

---

## API Endpoints Reference

### Get Latest Attendance
- **Endpoint:** `GET /api/attendance`
- **Response:** Single attendance session object
- **Used by:** Flutter app (initial load)

### Get Attendance History
- **Endpoint:** `GET /api/attendance/history?limit=20&offset=0`
- **Response:** Array of session summaries (without detailed names)
- **Used by:** Web UI, Flutter history screen

### Get Session Details
- **Endpoint:** `GET /api/attendance/history/:id`
- **Response:** Complete session object with all names
- **Used by:** Web UI detail view, Flutter session details

### Record Attendance (from Python Worker)
- **Endpoint:** `POST /api/attendance`
- **Request:** Attendance payload with present/absent names
- **Response:** `{success: true, attendance_id: number}`
- **Used by:** Python worker (after face recognition)

### Upload Additional Images
- **Endpoint:** `POST /api/attendance/upload_image`
- **Request:** Image data with session ID
- **Response:** `{success: true}`
- **Used by:** Python worker (for extra frames)

---

## Testing the Unified Data Structure

### 1. Test Python Worker -> API
```bash
curl -X POST http://localhost:3000/api/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "source": "auto",
    "total": 45,
    "present_names": ["Nguyễn Văn A", "Trần Thị B"],
    "absent_names": ["Phạm Văn D"],
    "image": null
  }'
```

Expected response:
```json
{
  "success": true,
  "attendance_id": 123
}
```

### 2. Test API -> Flutter
```dart
final service = AttendanceService();
final attendance = await service.fetchLastAttendance();
print(attendance?.fromJson(attendance!));
```

Should parse without errors and fields should match.

### 3. Test API -> Web UI
Check browser console when loading the app - the WebSocket messages should have `present_names`, `absent_names`, etc.

---

## Best Practices

1. **Always use snake_case in API payloads** - Even if internal code uses camelCase
2. **Validate field presence** - Use null coalescing (`??`) in Flutter to handle missing fields
3. **Timestamp consistency** - All timestamps are ISO 8601 format from server
4. **List fields** - Always initialize with empty arrays if null: `List<String>.from(json["field"] ?? [])`
5. **Image encoding** - Always use Base64 for image transmission, WebP format for compression

---

## Troubleshooting

### Issue: Flutter model parsing fails
**Cause:** Incorrect field name mapping  
**Solution:** Check that model.fromJson() matches current API field names (snake_case)

### Issue: Web UI shows empty attendance data
**Cause:** WebSocket payload field names don't match UI code  
**Solution:** Verify API is sending `present_names` and `absent_names` arrays

### Issue: Python worker gets 400 error
**Cause:** Wrong field names in POST payload  
**Solution:** Ensure sending `present_names`, `absent_names` (not `present`, `absent`)

### Issue: Image not displaying in Web UI or Flutter
**Cause:** Missing Base64 prefix or wrong format  
**Solution:** Ensure images are WebP format Base64-encoded with proper data URI prefix

---

## Version History

| Date | Component | Change |
|------|-----------|--------|
| 2026-04-18 | Python Config | Increased `face_recognition_threshold` from 0.1 → 0.4 |
| 2026-04-18 | Python Worker | Changed to send all images in `images` array instead of separate uploads |
| 2026-04-18 | API Gateway | Updated POST /api/attendance to receive and save `images` array |
| 2026-04-18 | API Database | Modified getLatestSession() & getSessionDetails() to return `images` array |
| 2026-04-18 | Web UI | Updated updateCameraView() to display multiple frames with selection |
| 2026-04-18 | Flutter App | Updated AttendanceModel to support `images` array |
| 2026-04-18 | Documentation | Updated DATA_UNIFICATION.md with multi-image support |
| 2026-04-18 | Flutter App | Updated AttendanceModel to match API response format |
| 2026-04-18 | Flutter App | Fixed AttendanceService endpoint from /attendance/last to /attendance |
| 2026-04-18 | Documentation | Created unified data structure documentation |

---

## Contact & Questions

For questions about the data structure, please refer to:
- Backend: API Gateway (`api-gateway/routes/attendance.js`)
- Frontend: Flutter Model (`app/lib/model/attendance_model.dart`)
- Worker: Pipeline (`python-worker/src/pipeline.py`)
- UI: JavaScript API (`web-ui/js/api.js`, `web-ui/js/ui.js`)
