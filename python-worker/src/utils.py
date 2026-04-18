import sys
from colorama import Fore, Style, init

init(autoreset=True)

class FancyText:
    """
    Utility class for colored terminal output.
    
    Provides methods for printing log messages with various colors and styles.
    """
    
    ColorsArray = {
        'red': Fore.RED,
        'green': Fore.GREEN,
        'yellow': Fore.YELLOW,
        'cyan': Fore.CYAN,
        'magenta': Fore.MAGENTA,
        'white': Fore.WHITE
    }

    @staticmethod
    def printf(text: str, color: str = 'white', bold: bool = False) -> None:
        """
        Print colored text to standard output.
        
        Args:
            text (str): Text to print
            color (str): Color name ('red', 'green', 'yellow', 'cyan', 'magenta', 'white')
            bold (bool): Whether to use bold styling
        """
        if not text:
            return
        color_code = FancyText.ColorsArray.get(color.lower(), Fore.WHITE)
        style_code = Style.BRIGHT if bold else ''
        sys.stdout.write(f"{style_code}{color_code}{text}{Style.RESET_ALL}\n")

    @staticmethod
    def info(text: str) -> None:
        """
        Print info log message in cyan.
        
        Args:
            text (str): Info message
        """
        FancyText.printf(f"[INFO] {text}", 'cyan', bold=True)

    @staticmethod
    def success(text: str) -> None:
        """
        Print success message in green.
        
        Args:
            text (str): Success message
        """
        FancyText.printf(f"[SUCCESS] {text}", 'green', bold=True)

    @staticmethod
    def warning(text: str) -> None:
        """
        Print warning message in yellow.
        
        Args:
            text (str): Warning message
        """
        FancyText.printf(f"[WARNING] {text}", 'yellow', bold=True)

    @staticmethod
    def error(text: str) -> None:
        """
        Print error message in red.
        
        Args:
            text (str): Error message
        """
        FancyText.printf(f"[ERROR] {text}", 'red', bold=True)

    @staticmethod
    def debug(text: str) -> None:
        """
        Print debug message in magenta.
        
        Args:
            text (str): Debug message
        """
        FancyText.printf(f"[DEBUG] {text}", 'magenta', bold=False)
