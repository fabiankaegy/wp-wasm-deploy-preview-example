# Instant Deployment Previews for WordPress

> **Warning**
> This is an early exploration of this topic and may as wel not go anywhere.

![Diagram showing the connection of the various tools at play](./diagram.png)

## High level Idea

The idea is to create a GitHub Action which can be used in any WordPress project with code managed in GitHub. This action would take a build WordPress Theme / Plugin / wp-content folder and store it as a CI artifact.

At the same time, it would deploy an instance of the [WordPress Playground](https://github.com/WordPress/wordpress-playground) to GitHub pages. This GitHub pages static site would then be able to read the build artifacts and spin-up a live preview of the deployment with that code activated right in the browser.
