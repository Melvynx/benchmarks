const page = await browser.getPage('lumail-film');
await page.goto('file:///private/var/folders/7z/5mtgxwxx4zs9ppgzm942gbmh0000gn/T/workspace.3j40YO/app/index.html');
await page.waitForSelector('video');
const result = await page.evaluate(async () => {
  const video = document.querySelector('video');
  if (video.readyState < 1) {
    await new Promise((resolve, reject) => {
      video.addEventListener('loadedmetadata', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Video failed to load')), { once: true });
    });
  }
  video.muted = true;
  await video.play();
  const start = video.currentTime;
  await new Promise(resolve => setTimeout(resolve, 1200));
  const advanced = video.currentTime > start + 0.5;
  video.pause();
  video.currentTime = 42;
  await new Promise(resolve => video.addEventListener('seeked', resolve, { once: true }));
  const box = video.getBoundingClientRect();
  return {
    title: document.title,
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
    controls: video.controls,
    advanced,
    seek: video.currentTime,
    error: video.error?.message ?? null,
    viewport: { width: innerWidth, height: innerHeight },
    player: { width: box.width, height: box.height },
    fits: box.width <= innerWidth + 1 && box.height <= innerHeight + 1,
    ratio: box.width / box.height,
    objectFit: getComputedStyle(video).objectFit,
    visibleHeading: document.querySelector('h1,h2,h3') !== null
  };
});
console.log(JSON.stringify(result, null, 2));
