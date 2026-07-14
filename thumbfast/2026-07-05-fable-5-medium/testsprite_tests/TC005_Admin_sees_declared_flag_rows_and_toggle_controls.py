import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:3000")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the sign-in page by navigating to /auth/signin so the 'Use password' button and email/password fields can be used.
        await page.goto("http://localhost:3000/auth/signin")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'Use password' button on the sign-in page to reveal the email and password fields.
        # Use password button
        elem = page.get_by_role('button', name='Use password', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the Email field with the test admin email, fill the Password field with the test admin password, and click the 'Sign in' button to submit the form.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("playwright-test-tsverify@example.com")
        
        # -> Fill the Email field with the test admin email, fill the Password field with the test admin password, and click the 'Sign in' button to submit the form.
        # password password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Tsverify-5430584b1!")
        
        # -> Fill the Email field with the test admin email, fill the Password field with the test admin password, and click the 'Sign in' button to submit the form.
        # Sign in button
        elem = page.get_by_role('button', name='Sign in', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the Admin 'Feature Flags' page (navigate to the application's Admin > Feature Flags URL).
        await page.goto("http://localhost:3000/admin/feature-flags")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify the flag descriptions and enabled states are visible
        # Assert: Flag 'Generation routing: APIYI first' description is visible.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[2]").nth(0)).to_have_text("Try APIYI before the official provider.", timeout=15000), "Flag 'Generation routing: APIYI first' description is visible."
        # Assert: Flag 'Generation routing: APIYI first' toggle is enabled.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[3]/button").nth(0)).to_have_attribute("value", "on", timeout=15000), "Flag 'Generation routing: APIYI first' toggle is enabled."
        # Assert: Flag 'Thumbnail Agent (beta)' description is visible.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[2]").nth(0)).to_have_text("Admin beta: YouTube URL to auto-generated thumbnails.", timeout=15000), "Flag 'Thumbnail Agent (beta)' description is visible."
        # Assert: Flag 'Thumbnail Agent (beta)' toggle is enabled.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[3]/button").nth(0)).to_have_attribute("value", "on", timeout=15000), "Flag 'Thumbnail Agent (beta)' toggle is enabled."
        # Assert: Flag 'Free-plan watermark' description is visible.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[2]").nth(0)).to_have_text("Watermark thumbnails on the free plan.", timeout=15000), "Flag 'Free-plan watermark' description is visible."
        # Assert: Flag 'Free-plan watermark' toggle is enabled.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[3]/button").nth(0)).to_have_attribute("value", "on", timeout=15000), "Flag 'Free-plan watermark' toggle is enabled."
        
        # --> Verify the generation routing, Thumbnail Agent, and free-plan watermark flags are listed
        await page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[1]").nth(0).scroll_into_view_if_needed()
        # Assert: Generation routing flag is listed in the Feature Flags table.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[1]").nth(0)).to_be_visible(timeout=15000), "Generation routing flag is listed in the Feature Flags table."
        await page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[1]").nth(0).scroll_into_view_if_needed()
        # Assert: Thumbnail Agent (beta) flag is listed in the Feature Flags table.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[1]").nth(0)).to_be_visible(timeout=15000), "Thumbnail Agent (beta) flag is listed in the Feature Flags table."
        await page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[1]").nth(0).scroll_into_view_if_needed()
        # Assert: Free-plan watermark flag is listed in the Feature Flags table.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[1]").nth(0)).to_be_visible(timeout=15000), "Free-plan watermark flag is listed in the Feature Flags table."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    