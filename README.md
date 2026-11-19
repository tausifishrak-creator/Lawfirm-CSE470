

## One-time installs

1. **Node.js:** download the **LTS** installer from https://nodejs.org and keep clicking Next with the defaults. Then open a new PowerShell window and run `node -v`. It must print `v18` or higher.
2. **XAMPP:** download it from https://www.apachefriends.org and install with the defaults, into `C:\xampp`.

## Every time it is needed see the site

**Step 1: Start the database.**
Open **XAMPP Control Panel** and click **Start** next to **Apache** and **MySQL**. Both should turn green. Apache is only needed for phpMyAdmin in Step 2.

**Step 2: Import the database.** Do this the first time, and again whenever `database/law_firm.sql` changes.
1. Go to http://localhost/phpmyadmin.
2. Click the **Import** tab at the top, with no database selected on the left.
3. Click **Choose File** and pick `C:\Users\<user>\Documents\GitHub\<project folder>\Lawfirm-CSE470\database\law_firm.sql`.
4. Scroll down and click **Import**.
5. On the left, `law_firm` should now appear with **10 tables**: appointments, availability_overrides, case_tasks, cases, clients, documents, lawyer_availability, lawyers, notifications and users.

Importing deletes any data already in `law_firm`.

**Already have a database and want to keep its data?** Instead of re-importing, run the small update files in `database\migrations\` once, in number order. In phpMyAdmin, select `law_firm` on the left, open the **Import** tab and choose the file. Each one only adds what's new.

**Step 3: Open PowerShell in the project folder.**
```powershell
cd "C:\Users\<user>\Documents\GitHub\<project folder>\Lawfirm-CSE470"
```
If the RAR file was extracted somewhere else, `cd` into that folder instead. It's the one containing `package.json`, `client` and `server`.

**Step 4: Create the settings file.** Do this the first time only.
```powershell
Copy-Item server\.env.example server\.env
```
The defaults (user `root`, no password) match XAMPP. If you set a MySQL password, run `notepad server\.env` and put it after `DB_PASS=`.

**Step 5: Install packages.** Do this the first time, and again after pulling changes that touch any `package.json`. It takes 1–3 minutes, and yellow warnings are normal.
```powershell
npm run install:all
```

**Step 6: Start the app.**
```powershell
npm run dev
```
Wait until these lines show up:
- `Law Firm API running on http://localhost:5000`
- `Local: http://localhost:5173/`

Leave this window open, because closing it stops the site.

**Step 7: Open http://localhost:5173 in your browser.**

## Logging in

Just enter the username and password. The site knows each account's role and opens the right dashboard.

| Role | Username | Password | What to try |
|------|----------|----------|-------------|
| Admin | `admin` | `admin123` | Admin Panel: approve or reject lawyers, verification history |
| Lawyer | `sarah_khan` | `password123` | 🔔 notifications, **Pending Approval** (accept or decline case requests), My Cases (update status), My Schedule (weekly hours + availability calendar), Appointments (accept, reject, reschedule, schedule with a client), Documents, Case Tasks |
| Client | `john_doe` | `password123` | **Find a Lawyer** → submit a case, My Cases, **📅 Schedule** an appointment on the lawyer's calendar, upload documents |

**Try the whole flow:** log in as `john_doe`, go to **Find a Lawyer** and submit a case to Sarah Khan. Log in as `sarah_khan`: the 🔔 bell and **Pending Approval** show the request, so accept it. Back as `john_doe`, open **My Cases** and click **📅 Schedule** to book a free slot. That slot now shows as 🔒 Booked for every other client.

There are more sample accounts with the same password: clients `ayesha_r` and `karim_u`, lawyers `rafiq_ahmed` and `nadia_islam`.

To stop the site, press **Ctrl + C** in the PowerShell window. Next time you only need Steps 1, 3, 6 and 7.

## If something goes wrong

| Problem | Fix |
|---------|-----|
| `npm.ps1 cannot be loaded because running scripts is disabled` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer `Y`, then retry. |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL isn't running. Start it in XAMPP. |
| `Unknown database 'law_firm'` or `Table ... doesn't exist` | Step 2 wasn't done, or was done with an old SQL file. Re-import. |
| `Access denied for user 'root'` | Your MySQL has a password. Put it in `server\.env` after `DB_PASS=`. |
| `Table 'law_firm.notifications' doesn't exist` | Your database is older than this update. Re-import `law_firm.sql`, or run the files in `database\migrations\`. |
| Apache won't start (port 80 in use) | Skip phpMyAdmin and import from PowerShell with the command below. |

The import command, if you can't use phpMyAdmin:
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "source C:/Users/<user>/Documents/GitHub/CSE471/CSE471-project-me/Lawfirm-CSE470/database/law_firm.sql"
```
