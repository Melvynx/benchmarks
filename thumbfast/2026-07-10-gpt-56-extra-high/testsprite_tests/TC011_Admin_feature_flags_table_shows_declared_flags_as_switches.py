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
        
        # -> Click the 'Sign in' link in the site header to open the sign-in page.
        # Sign in link
        elem = page.get_by_role('link', name='Sign in', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Use password' button in the sign-in dialog to reveal the email and password fields.
        # Use password button
        elem = page.get_by_role('button', name='Use password', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'Email' field with playwright-test-tsverify@example.com, fill the 'Password' field with Tsverify-5430584b1!, then click the 'Sign in' button to submit the form.
        # you@example.com email field
        elem = page.locator('[id="email"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("playwright-test-tsverify@example.com")
        
        # -> Fill the 'Email' field with playwright-test-tsverify@example.com, fill the 'Password' field with Tsverify-5430584b1!, then click the 'Sign in' button to submit the form.
        # password password field
        elem = page.locator('[id="password"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Tsverify-5430584b1!")
        
        # -> Fill the 'Email' field with playwright-test-tsverify@example.com, fill the 'Password' field with Tsverify-5430584b1!, then click the 'Sign in' button to submit the form.
        # Sign in button
        elem = page.get_by_role('button', name='Sign in', exact=True)
        await elem.click(timeout=10000)
        
        # -> Navigate to the admin Feature Flags page (open the '/admin/feature-flags' page) so the list of flags can be inspected.
        await page.goto("http://localhost:3000/admin/feature-flags")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify the table lists three rows - 'Generation routing: APIYI first', 'Thumbnail Agent (beta)', and 'Free-plan watermark' - each with a single short one-line description and a toggle switch control (not an Enable/Disable text button) that is fully visible without being cut off
        # Assert: Flag row contains 'Generation routing: APIYI first'.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[1]").nth(0)).to_contain_text("Generation routing: APIYI first", timeout=15000), "Flag row contains 'Generation routing: APIYI first'."
        # Assert: Generation routing has the one-line description.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[2]").nth(0)).to_have_text("Try APIYI before the official provider.", timeout=15000), "Generation routing has the one-line description."
        await page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[3]/button").nth(0).scroll_into_view_if_needed()
        # Assert: Generation routing toggle switch is visible and fully rendered.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[3]/button").nth(0)).to_be_visible(timeout=15000), "Generation routing toggle switch is visible and fully rendered."
        # Assert: Generation routing control is implemented as a switch control.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[1]/td[3]/button").nth(0)).to_have_attribute("role", "switch", timeout=15000), "Generation routing control is implemented as a switch control."
        # Assert: Flag row contains 'Thumbnail Agent (beta)'.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[1]").nth(0)).to_contain_text("Thumbnail Agent (beta)", timeout=15000), "Flag row contains 'Thumbnail Agent (beta)'."
        # Assert: Thumbnail Agent has the one-line description.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[2]").nth(0)).to_have_text("Admin beta: YouTube URL to auto-generated thumbnails.", timeout=15000), "Thumbnail Agent has the one-line description."
        await page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[3]/button").nth(0).scroll_into_view_if_needed()
        # Assert: Thumbnail Agent toggle switch is visible and fully rendered.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[3]/button").nth(0)).to_be_visible(timeout=15000), "Thumbnail Agent toggle switch is visible and fully rendered."
        # Assert: Thumbnail Agent control is implemented as a switch control.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[2]/td[3]/button").nth(0)).to_have_attribute("role", "switch", timeout=15000), "Thumbnail Agent control is implemented as a switch control."
        # Assert: Flag row contains 'Free-plan watermark'.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[1]").nth(0)).to_contain_text("Free-plan watermark", timeout=15000), "Flag row contains 'Free-plan watermark'."
        # Assert: Free-plan watermark has the one-line description.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[2]").nth(0)).to_have_text("Watermark thumbnails on the free plan.", timeout=15000), "Free-plan watermark has the one-line description."
        await page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[3]/button").nth(0).scroll_into_view_if_needed()
        # Assert: Free-plan watermark toggle switch is visible and fully rendered.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[3]/button").nth(0)).to_be_visible(timeout=15000), "Free-plan watermark toggle switch is visible and fully rendered."
        # Assert: Free-plan watermark control is implemented as a switch control.
        await expect(page.locator("xpath=/html/body/div[1]/main/div/div/div/div/div[2]/div/table/tbody/tr[3]/td[3]/button").nth(0)).to_have_attribute("role", "switch", timeout=15000), "Free-plan watermark control is implemented as a switch control."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    