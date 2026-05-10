# Deployment Guide for AI-Powered Streetwear Store

Follow these phases to properly deploy your e-commerce application to production.

## Phase 1: Prepare Your Code and Keys
Before moving anything to the cloud, your local environment needs to be secure and production-ready.

*   **Secure Your API Keys:** Ensure your Google AI Studio API key, database URLs, and payment gateway keys are not hardcoded into your files. They must be stored in a `.env` file.
*   **Add .env to .gitignore:** Make sure your `.env` file is listed in your `.gitignore` file so you don't accidentally publish your secret keys to GitHub. *(Note: This has already been done in your codebase)*
*   **Push to GitHub:** Commit all your final code and push the repository to GitHub. This will make automated deployment much easier.

## Phase 2: Deploy and Secure the Backend
If you are using a Backend-as-a-Service (BaaS) like Supabase or Firebase to handle your user authentication and product database, the "deployment" is already mostly done, but you need to lock it down.

*   **Enable Row Level Security (RLS):** If using Supabase, ensure RLS is active on your Products and Orders tables. You don't want unauthorized users modifying your T-shirt inventory or viewing other customers' orders.
*   **Update Authorized Domains:** In your backend authentication settings (Firebase Auth or Supabase Auth), you must add your future live website URL to the list of authorized domains. Otherwise, users won't be able to log in.

## Phase 3: Deploy the Frontend

### Choice A: Firebase Hosting (Recommended for this project)
Since your project already has `firebase.json` and `.firebaserc` configured:

1. **Build Your Site:** Run `npm run build` to generate the `dist` folder.
2. **Deploy via AI Studio:** Use the **Share** or **Deploy** button in the AI Studio interface.
3. **Manual Deploy:** If you have the Firebase CLI installed locally, run:
   ```bash
   npm run deploy
   ```
   *Note: If you see "Site Not Found", it means you haven't successfully completed a deploy yet, or your custom domain setup is still propagating.*

### Choice B: Vercel or Netlify
Vercel or Netlify are excellent alternatives for React/Vite projects.
...

## Alternative: Deploy to Shared Hosting (InfinityFree / cPanel)
If you prefer to deploy manually to shared hosting platforms like InfinityFree using cPanel's File Manager:

1. **Build Your Project Locally:** In your local code editor, run your build command (usually `npm run build:hosting` or `npm run build`). This will compile your code and generate a new folder called `dist` (or `htdocs`), which contains the production-ready version of your site.
2. **Navigate to htdocs:** Inside the InfinityFree file manager (or any cPanel file manager), look for a folder named `htdocs` (or `public_html`). This is your main public web directory. Click to open it.
3. **Clear the Default Files:** Delete any placeholder files InfinityFree might have put in there, such as `index2.html` or `index.php`.
4. **Upload the Build:** Take all the individual files and folders located inside your local `dist` (or generated `htdocs` folder) and upload them directly into the remote `htdocs` folder. Your `index.html` file must sit directly inside `htdocs` for the site to load.

> **Tip regarding Zip files:** If you find uploading individual files slow, you can compress the contents of your build into a `.zip` file (like `htdocs.zip`), upload it into the remote `htdocs` folder, and right-click it to **Extract** the files directly there. Be sure not to extract a folder *into* the `htdocs` folder if the folder itself contains `index.html` (e.g. `htdocs/htdocs/index.html` will not work). Wait for it to finish, then delete the `htdocs.zip` to save space.

## Phase 4: Connect Your Custom Domain
To build brand trust, you want your customers shopping on a professional domain rather than a free subdomain.

*   **Purchase or Locate Your Domain:** Go to the registrar where you manage your domain.
*   **Update DNS Records:** In your hosting dashboard (Vercel/Netlify), add your custom domain. The platform will provide you with specific DNS records (usually an A Record and a CNAME record).
*   **Apply Records to Registrar:** Copy those records and paste them into the DNS settings of your domain registrar.
*   **Wait for Propagation:** It can take anywhere from a few minutes to 24 hours for the SSL certificate to generate and the domain to connect globally.

Once the DNS propagates, your AI-powered streetwear store will be live and ready for traffic.
