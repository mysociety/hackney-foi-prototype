# Hackney FOI prototype

FOI and SAR request forms, for user testing.

---

## Setup

    git submodule update --init
    gem install jekyll
    jekyll serve

## About the `baseurl`

`_config.yml` defines a `baseurl` of `/hackney-foi-prototype`, making this repo suitable for instant deployment on Github Pages.

However, it also means, when running locally with `jekyll serve`, you’ll need to visit <http://localhost:4000/hackney-foi-prototype/> (with a trailing slash) to see the site.

If you’d like your preview site to be available at <http://localhost:4000> instead, you can override `baseurl` to an empty string, like so:

    jekyll serve --baseurl ''

## About the Sass styles

Most of the base styling comes from [GOV.UK elements](https://github.com/alphagov/govuk_elements) and the [GOV.UK frontend toolkit](https://github.com/alphagov/govuk_frontend_toolkit), both of which are included as Git submodules, and then added to Jekyll’s Sass `load_path` by a few lines in `_config.yml`.

The custom `load_paths` trick means we don’t have to worry about the relative locations of our first-party code and the two third-party libraries, and `@import` statements between them _just work_ without crazy long paths.
