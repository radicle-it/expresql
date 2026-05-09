# Contributing to ExpreSQL

ExpreSQL is a fork of [Oracle's Quick SQL](https://github.com/oracle/quicksql),
released under the Universal Permissive License v1.0. We welcome your
contributions to this fork.

## Opening issues

For bugs or enhancement requests, please file a GitHub issue unless it is
security related. If you think you've found a security vulnerability, do not
raise a GitHub issue and follow the instructions in our
[security policy](./SECURITY.md).

## Contributing code

By submitting a pull request, you agree that your contribution is licensed
under the [Universal Permissive License v1.0](./LICENSE.txt) — the same
license under which the original Quick SQL project and this fork are released.

We recommend signing your commits using `git commit --signoff` (or `-s`) so
that the `Signed-off-by:` trailer is included. This serves as a
[Developer Certificate of Origin](https://developercertificate.org/)
attestation that you have the right to contribute the code.

## Getting started

1. Open a terminal window
2. Clone the repository
3. Change into the cloned repository directory
4. Install dependencies by running

    ```bash
    npm install
    ```

## Building locally

Once you have set up the project, you can build the library by executing:

```bash
npm run build
```

## Running tests

Once you have set up the project, you can run the test suite by executing:

```bash
npm run test
```

## Running the example CLI

Once you have built the library, you can run the example CLI by executing:

```bash
npm run example-cli -- ./test/department_employees.esql
```

## Pull request process

1. Ensure there is an issue created to track and discuss the fix or enhancement
   you intend to submit.
1. Fork this repository.
1. Create a branch in your fork to implement the changes. We recommend using
   the issue number as part of your branch name, e.g. `1234-fixes`.
1. Ensure that any documentation is updated with the changes that are required
   by your change.
1. Ensure that any samples are updated if the base image has been changed.
1. Submit the pull request. *Do not leave the pull request blank*. Explain
   exactly what your changes are meant to do and provide simple steps on how
   to validate your changes. Reference the issue you created.
1. A maintainer will review your pull request before it is merged.

## Code of conduct

Follow the [Golden Rule](https://en.wikipedia.org/wiki/Golden_Rule). If you'd
like more specific guidelines, see the [Contributor Covenant Code of Conduct][COC].

[COC]: https://www.contributor-covenant.org/version/1/4/code-of-conduct/
