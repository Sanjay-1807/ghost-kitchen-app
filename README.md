# Ghost Kitchen Command Center (App Prototype)

MRP project prototype by Sanjay Gaviriboina, Nithin Reddy Gurram, Haripriya Dommeti and Nithinkumar Kanugula.

One internal web app for a kitchen that runs three delivery-only brands (Nonna's Slice House, Bombay Street Bowls, Flame and Bun). Orders from Delivery App 1, Delivery App 2 and phone/text are brought into one standard order table. Customers still see three separate brands.

## Features

| Screen | What it does | Who sees it |
|---|---|---|
| Sign in | Choose Owner or Shift Lead. No password (prototype). | Everyone |
| Home | Staffing alert, packing queue, KPI tiles, data-flow diagram, recent activity | Everyone (Owner sees all 6 KPIs) |
| Order Hub | All orders in one table. Add phone/text or Delivery App 2 orders with a form. Import a Delivery App 1 CSV with column mapping and error checks. | Everyone (profit column for Owner only) |
| Packing Check | Tick every line before an order leaves, or log a mistake and its reason | Everyone |
| Staffing | Live check of orders waiting per staff member, red alert above 2, suggested schedule | Everyone |
| Profit Tracker | Profit per order by brand, channel and menu item, plus a what-if slider | Owner only |
| KPIs | The 6 project KPIs against targets, link to the Before vs After dashboard | Owner only |
| Guide | Step-by-step tutorial for each feature, and a reset button | Everyone |

## Data

* `js/seed.js` is Synthetic Dataset 1 (2,500 orders, 23 variables) packed for the browser.
* `sample-data/delivery_app_1_export.csv` is a sample Delivery App 1 export with its own column names. One row has an item that is not on the menu, so you can see it flagged.
* Anything you add is saved in your browser (localStorage). Use Guide > Reset demo data to start again.
* No real customer, payment or delivery-platform data is used.

## Publish on GitHub Pages (free)

1. Sign in at https://github.com (create a free account if needed).
2. Click **+** (top right) > **New repository**. Name it exactly **ghost-kitchen-app**, choose **Public**, then click **Create repository**.
3. On the new repo page, click the **uploading an existing file** link.
4. Unzip `ghost-kitchen-app.zip`. Open the unzipped folder, select **everything inside it** (index.html, css, js, vendor, sample-data, README.md, .nojekyll) and drag it into the upload box. Upload the files inside the folder, not the folder itself.
5. Click **Commit changes** and wait for the upload to finish.
6. Go to **Settings** > **Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main** and folder **/ (root)**, then click **Save**.
7. Wait 1 to 3 minutes and refresh the Pages settings page. Your link appears at the top:
   `https://YOUR-USERNAME.github.io/ghost-kitchen-app/`

### Link to the dashboard

The KPIs page has an "Open Before vs After dashboard" button. If you publish the dashboard in a repo named **ghost-kitchen-dashboard** on the same account, the button works with no changes. If you use a different name, edit `DASHBOARD_URL` in `js/config.js`.

## Run it on your own computer

Double-click `index.html`. Everything works offline, including the sample CSV import.
