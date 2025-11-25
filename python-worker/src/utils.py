import sys
from colorama import Fore, Style, init

init(autoreset=True)

class FancyText:
    ColorsArray = {
        'red': Fore.RED,
        'green': Fore.GREEN,
        'yellow': Fore.YELLOW,
        'blue': Fore.BLUE,
        'magenta': Fore.MAGENTA,
        'cyan': Fore.CYAN,
        'white': Fore.WHITE,
        'lightblack': Fore.LIGHTBLACK_EX,
        'lightwhite': Fore.LIGHTWHITE_EX
    }

    @staticmethod
    def printf(text: str, color: str = 'white', bold: bool = False) -> None:
        """In text với màu và bold tùy chọn"""
        if not text:
            return
        color_code = FancyText.ColorsArray.get(color.lower(), Fore.WHITE)
        style_code = Style.BRIGHT if bold else ''
        sys.stdout.write(f"{style_code}{color_code}{text}{Style.RESET_ALL}\n")

    @staticmethod
    def info(text: str) -> None:
        """Info log (blue/cyan)"""
        FancyText.printf(f"[INFO] {text}", 'cyan', bold=True)

    @staticmethod
    def success(text: str) -> None:
        """Success log (green)"""
        FancyText.printf(f"[SUCCESS] {text}", 'green', bold=True)

    @staticmethod
    def warning(text: str) -> None:
        """Warning log (yellow)"""
        FancyText.printf(f"[WARNING] {text}", 'yellow', bold=True)

    @staticmethod
    def error(text: str) -> None:
        """Error log (red)"""
        FancyText.printf(f"[ERROR] {text}", 'red', bold=True)

    @staticmethod
    def debug(text: str) -> None:
        """Debug log (magenta hoặc dim white)"""
        FancyText.printf(f"[DEBUG] {text}", 'magenta', bold=False)
