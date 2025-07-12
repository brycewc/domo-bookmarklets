# Bookmarklets for MajorDomos

This repository is a collection of helpful [bookmarklets](https://en.wikipedia.org/wiki/Bookmarklet) for Domo power users and system admins (also called [MajorDomos](https://www.domo.com/learn/majordomo)). These bookmarklets are scripts that run in one click from your browser favorites bar. Easy access and context of the current browser window makes these bookmarklets extremely valuable for accomplishing common MajorDomo tasks quickly and efficiently. Each bookmarklet is designed to dynamically adapt to the Domo instance you are currently viewing, ensuring easy setup and seamless use between various Domo instances. Authentication isn't needed as they use your already authenticated browser session.

## Types of Bookmarklets

This repo is separated into 4 different folders, each holding a different type of bookmarklet. The different types are:

- Copy - Copy something to your clipboard
- Delete - Delete something
- Navigate to Copied - Navigate to an object based on an ID already copied to your clipboard
- Other - Other helpful scripts that don't fit into the other categories

## Syncing Bookmarklets to Your Browser Favorites

You can easily sync all the bookmarklets in this repo to your browser favorites bar using the [GitHub Bookmarklet Sync browser extension](https://github.com/yeger00/marklet-hub). That repo contains instructions to set up the browser extension. After installation, enter setup by clicking the extension, then enter **brycewc** as the _GitHub Organization_ and **domo-bookmarklets** as the _Repository Name_. To rename the folder (default is _brycewc/domo-bookmarklets_), add the desired folder name in the _Bookmark Folder Name (optional)_ field.

## Contributing

Feel free to open issues or submit pull requests if you experience any bugs or have improvement suggestions. I am happy to build more bookmarklets for those without JavaScript knowledge, just open an issue and tell me what you'd like to see added. For those creating or editing bookmarklets, I'd highly recommend installing the [Bookmarkletify VS Code extension](https://marketplace.visualstudio.com/items?itemName=saasan.bookmarkletify) for transforming formatted JavaScript to minified bookmarklet code for easy testing. The GitHub Bookmarklet Sync browser extension already includes that functionality, so the VS Code extension isn't need to use these bookmarklets, only to test them before submitting a pull request.

## APIs

Some bookmarklets in this repo use Domo APIs. Any API used will be from the Product APIs (as opposed to the App Framework and OAuth/Platform APIs). To explore the Product APIs, you can use my [Postman collection](https://www.postman.com/brycewc/workspace/domo-product-apis).

## Disclaimer

This GitHub repository is unofficial and not provided by Domo, Inc. Use this GitHub repository at your own risk. These bookmarklets and Domo's Product APIs are subject to change without notice. You are responsible for anything done using these bookmarklets and APIs. Initial use in a sandbox environment is recommended. Once synced using the GitHub Bookmarklet Sync browser extension, the JavaScript code will become unreadable. Analysis of their code should instead be done in GitHub or by cloning this repo to your local machine.
