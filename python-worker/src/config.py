"""Configuration management module."""

import json
import os
import threading
from src.utils import FancyText

CONFIG_FILE = 'config.json'
DEFAULT_CFG = {
    'image_capture_interval': ['07:00'],
    'retry_delay': 3,
    'face_recognition_threshold': 0.4,
    'frame_count': 2
}


class ConfigManager:
    """
    Singleton configuration manager with thread-safe access.
    
    Manages system configuration loaded from JSON file with fallback to defaults.
    Ensures thread-safe read/write operations.
    """
    
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Create singleton instance."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ConfigManager, cls).__new__(cls)
                cls._instance._init_config()
            return cls._instance

    def _init_config(self):
        """Initialize configuration with defaults."""
        self.config = DEFAULT_CFG.copy()
        self.load()

    def load(self):
        """
        Load configuration from JSON file.
        
        Merges with defaults if keys are missing.
        Creates default config file if it doesn't exist.
        """
        try:
            if not os.path.exists(CONFIG_FILE):
                self.save()
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.config = {**DEFAULT_CFG, **data}
            if self.config != data:
                self.save()
        except Exception as e:
            FancyText.error(f'Failed to load configuration ({type(e).__name__}): {e}')

    def save(self):
        """Save current configuration to JSON file."""
        try:
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            FancyText.error(f'Failed to save configuration ({type(e).__name__}): {e}')

    def get(self, key, default=None):
        """
        Get configuration value (thread-safe).
        
        Args:
            key (str): Configuration key
            default: Default value if key not found
            
        Returns:
            Configuration value or default
        """
        with self._lock:
            return self.config.get(key, default)

    def update(self, new_dict):
        """
        Update configuration and save to file.
        
        Only allows updating keys that exist in DEFAULT_CFG.
        
        Args:
            new_dict (dict): Configuration updates
        """
        with self._lock:
            allowed_updates = {k: v for k, v in new_dict.items() if k in DEFAULT_CFG}
            if allowed_updates:
                self.config.update(allowed_updates)
                self.save()
                FancyText.success('Configuration updated and saved.')


# Global singleton instance for application-wide access
cfg = ConfigManager()