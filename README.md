# Decor My Nest Studio App

## Installing on iPad / iPhone (as an app icon)

This app is now a PWA (manifest.json + sw.js), so it can be installed straight
from Safari — no App Store needed:

1. Push this whole folder to a GitHub repo, then turn on **GitHub Pages**
   (Settings → Pages → deploy from the `main` branch).
2. On the iPad, open the GitHub Pages URL in **Safari** (must be Safari, not
   Chrome — iOS only allows installing PWAs from Safari).
3. Tap the **Share** button → **Add to Home Screen** → **Add**.
4. Launch it from the home screen icon like any other app. It opens full
   screen with no browser bar, and works offline for anything already
   visited once (Measurements, saved customers, etc. are cached locally).

Notes:
- The DISTO X3 Bluetooth chooser needs HTTPS to work in Safari — GitHub
  Pages serves over HTTPS by default, so this works once deployed, unlike
  opening `index.html` directly from Files.
- If you update the app later, bump `CACHE_VERSION` at the top of `sw.js`
  so installed iPads pick up the new version instead of serving the old
  cached files.


A mobile-friendly painting measurement app that runs directly in the browser.

## Run

Double-click `Start Decor My Nest.bat`. It opens the app in Microsoft Edge through
localhost so Leica DISTO X3 Bluetooth can work.

Opening `index.html` directly supports manual measurements, but browser security
may block the Leica Bluetooth chooser.

## Painting system rate sheet

Double-click `Open Painting Rate Sheet.bat` to edit the live CSV in Excel. Use
these columns exactly: Product, Painting Type, Painting System, Surface /
Substrate, Rate per Sq Ft, Active, and Last Updated.

Save the CSV in place. When the app is running through `Start Decor My Nest.bat`,
it checks the sheet every 15 seconds and automatically updates matching rates.
You can alternatively paste a published Google Sheet CSV URL in the app.

## Included

- Multiple room measurements
- Itemised estimate table with area description, substrate, L/W/H, deductions, rate, and line total
- Leica DISTO X3 Bluetooth Smart measurement capture
- Automatic wall area and opening deductions
- Paint quantity with coats, coverage, and wastage
- Paint and labour estimate for the complete project
- Site notes and photo capture
- Printable site report
- Automatic local saving
