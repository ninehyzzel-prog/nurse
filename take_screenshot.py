import sys
import time
from playwright.sync_api import sync_playwright

def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "render.png"
    width = int(sys.argv[2]) if len(sys.argv) > 2 else 1600
    height = int(sys.argv[3]) if len(sys.argv) > 3 else 1050

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=2)
        page = context.new_page()
        page.goto("http://127.0.0.1:5173/admin/roster/2026-11", wait_until="networkidle")
        time.sleep(1.0)
        page.screenshot(path=out_path, full_page=True)
        browser.close()
        print(f"Screenshot saved to {out_path}")

if __name__ == "__main__":
    main()
