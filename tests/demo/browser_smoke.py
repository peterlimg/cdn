from pathlib import Path

from playwright.sync_api import sync_playwright


OUTPUT = Path("/tmp/cdn-demo-browser")
OUTPUT.mkdir(parents=True, exist_ok=True)


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1400})
        page.goto("http://localhost:3000", wait_until="networkidle")
        page.screenshot(path=str(OUTPUT / "home.png"), full_page=True)

        page.goto("http://localhost:3000/domains", wait_until="networkidle")
        page.screenshot(path=str(OUTPUT / "domains.png"), full_page=True)

        page.get_by_role("link", name="New ready domain").click()
        page.wait_for_load_state("networkidle")
        page.screenshot(path=str(OUTPUT / "zone-detail-initial.png"), full_page=True)

        page.get_by_role("button", name="Send request through edge").click()
        page.wait_for_timeout(250)

        page.get_by_role("button", name="Enable edge cache").click()
        page.wait_for_timeout(250)
        page.get_by_role("button", name="Send request through edge").click()
        page.wait_for_timeout(250)
        page.get_by_role("button", name="Send request through edge").click()
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUTPUT / "zone-detail-after-hit.png"), full_page=True)

        for _ in range(8):
            page.get_by_role("button", name="Send request through edge").click()
            page.wait_for_timeout(120)

        page.screenshot(path=str(OUTPUT / "zone-detail-quota.png"), full_page=True)
        page.goto("http://localhost:3000/analytics", wait_until="networkidle")
        page.screenshot(path=str(OUTPUT / "analytics.png"), full_page=True)

        browser.close()


if __name__ == "__main__":
    main()
