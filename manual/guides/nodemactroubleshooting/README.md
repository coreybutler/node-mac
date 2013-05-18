# Troubleshooting

If you're having problems with your service, please remember to check the logs in
`/Library/Logs/<myappname>`, also visible through the Console app on your Mac.

Services on OSX are pretty straightforward. The only file (other than logs) generated
is a standard `plist` file, found in `/Library/LaunchDaemons`. If your service won't startup,
this file can be checked - but it is very unlikely to be the root of the problem.

Most issues stem from changing the `wrapper.js` file (not a recommended practice).

## Other Issue?

If you are having other issues, please post them in the [bug tracker](https://github.com/coreybutler/node-mac/issues).
