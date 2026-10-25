# AIM-AirBnB (front end only)

Plain HTML, CSS and JavaScript. No PHP, no MySQL, no build step, no server.

```
public/           the whole site (this is what gets deployed)
  admin/          admin panel at /admin/
  assets/photos/  stay photos
  js/store.js     data layer: sample data, pricing, bookings and admin logic, all in the browser
vercel.json       tells Vercel to serve the public/ folder
```

## Deploy on Vercel
Import the repo (root = the folder that contains `vercel.json`) and deploy. No settings needed.
Setting Vercel's "Root Directory" to `public` works too.

## Admin
Open `/admin/` and sign in as the owner account defined in `public/js/store.js` (`OWNER`).
Change the password in Admin > Settings > Security (10+ characters).

## How data works now
All data (properties, bookings, enquiries, settings, admin changes) is saved in the visitor's own browser (localStorage).
On first load the site is filled with 9 sample stays. Remove them in Admin > Settings > Clear sample data.

This means:
- Data is NOT shared between devices or visitors. A booking made on a guest's phone does not reach the admin on your laptop.
- Clearing browser data resets the site to the sample data. Use Admin > Settings > Export for backups.
- No emails or SMS are sent.
- The admin username and password can be read by anyone who views the page source. Treat this as a preview, not real security.

When a real back end is added (for example Supabase), replace the local back end in `js/store.js` (the `route()` function and
what it calls) with real API calls. The pages talk to it only through `AIM.api(method, path, body)`.
