# TODO List

- Config module is getting big enough to be unweildy and could (probably) be replaced with [convict](https://www.npmjs.com/package/convict)
- Using dotenv preloading would alleviate the race condition that spurred the creation of the roll-your-own config module in the first place
- JSON web tokens for password reset (at least)
- Date formatting for expires should go in in email template (make sure it works)
- Customizable payload for password reset email
- When passing in table prefixes / column names, make sure they're valid for postgres
- Standardize custom errors within package
- Finish admin auth unit tests
- Export the `simpleOutput` route helper for use elsewhere
- System context module is a bit awkward and overlaps with config; consolidate

