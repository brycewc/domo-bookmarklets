# Bookmarklets for MajorDomos

This repository is a collection of helpful [bookmarklets](https://en.wikipedia.org/wiki/Bookmarklet) for Domo power users and system admins (also called [MajorDomos](https://www.domo.com/learn/majordomo)). Bookmarklets (also called favlets) are scripts that run in one click from your browser favorites bar. Easy access and context of the current browser window makes these bookmarklets extremely valuable for accomplishing common MajorDomo tasks quick and easy. Each bookmarklet is designed to dynamically adapt to the Domo instance you are currently viewing, ensuring easy setup and seamless use between various Domo instances. Authentication isn't needed as they use your already authenticated browser session.

## Highlighted Bookmarklets

- [Activity Log Current Object](<Activity Log Current Object.js>) - View the activity log (using a card built on DomoStats data) filtered to the current object. First-time setup (per instance) is required, where you will enter the card ID, object ID column name, and object type column name. Then, that information is saved in your browser's local storage so you don't have to enter it again for that instance.
- [Copy Current Object ID](<Copy Current Object ID.js>) - Copy the current object's ID to your clipboard.
- [Delete > Beast Mode](<Delete/Beast Mode.js>) - In Beast Mode Manager, delete the current Beast Mode (not supported in the UI!).
- [Other > Enable Data Repair](<Other/Enable Data Repair.js>) - Enable data repair on the current DataSet, which allows you to download, replace, or delete updates to rows in the DataSet.
- [Other > Get All Pages for Card](<Other/Get All Pages for Card.js>) - Shows all pages/dashboards, app studio apps, and report builder reports that contain the current card.
- [Other > Share with Self](<Other/Share with Self.js>) - As an admin, quickly share the current page, DataSet account, or custom app design (depending on current URL) with yourself without navigating to admin settings.
- [Update > DataFlow Name](<Update/DataFlow Name.js>) - Rename the current DataFlow, _without creating a new version_.

## Types of Bookmarklets

This repository is separated into 4 different folders, each holding a different type of bookmarklet. The different types are:

- **Root** - Two quick access bookmarklets: Activity Log Current Object and Copy Current Object ID.
- **Delete** - Delete an object or objects e.g., Beast Mode, Page and All Cards, etc.
- **Navigate to Copied** - Navigate to an object based on an ID already copied to your clipboard.
- **Other** - Other helpful scripts that don't fit into the other categories e.g., Get All Pages for Card, Share with Self, etc.
- **Update** - Update an object e.g., Alert Owner, DataFlow Name, etc.

## Syncing Bookmarklets to Your Browser Favorites

You can easily sync all the bookmarklets in this repository to your browser favorites bar (and convert them from JavaScript to bookmarklet code) using my [Bookmarklet Sync from GitHub browser extension](https://github.com/brycewc/bookmarklet-sync-from-github). That repository contains instructions to set up the browser extension, which is now available in the [Chrome Web Store - Bookmarklet Sync from GitHub](https://chromewebstore.google.com/detail/bookmarklet-sync-from-git/hfckbalabggfedpkmlhmnelkjnnfmgjj?hl=en-US). After installation, enter setup by clicking the extension, then enter **brycewc** as the _GitHub Organization or User\*_ and **domo-bookmarklets** as the _Repository Name\*_. To rename the folder (default is the repository name, in this case _brycewc/domo-bookmarklets_), add the desired folder name in the _Bookmark Folder Name (optional)_ field. Syncing of bookmarklets requires manually clicking on the extension and clicking _Sync Bookmarks_. If you want to know when updates are made or new bookmarklets are added, you can watch this repository. Adding a GitHub personal access token in the _GitHub Token_ field is required to access a private repositories and optional for public repositories, but it does increase your API call limit.

## Contributing

Feel free to open issues or submit pull requests if you experience any bugs or have improvement suggestions. I am happy to build more bookmarklets for those without JavaScript knowledge, just open an issue and tell me what you'd like to see added. For those creating or editing bookmarklets, I'd highly recommend installing the [Bookmarkletify VS Code extension](https://marketplace.visualstudio.com/items?itemName=saasan.bookmarkletify) for transforming formatted JavaScript to minified bookmarklet code for easy testing. The GitHub Bookmarklet Sync browser extension already includes that functionality, so the VS Code extension isn't need to use these bookmarklets, only to test them before submitting a pull request.

## APIs

Some bookmarklets in this repository use Domo APIs. Any API used will be from the Product APIs (as opposed to the App Framework and OAuth/Platform APIs). To explore the Product APIs, you can use my [Postman collection](https://www.postman.com/brycewc/workspace/domo-product-apis).

## Disclaimer

This GitHub repository is unofficial and not provided by Domo, Inc. Use this GitHub repository at your own risk. These bookmarklets and Domo's Product APIs are subject to change without notice. You are responsible for anything done using these bookmarklets and APIs. Initial use in a sandbox environment is recommended. Once synced using the GitHub Bookmarklet Sync browser extension, the JavaScript code will become unreadable. Analysis of their code should instead be done in GitHub or by cloning this repository to your local machine.
