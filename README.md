# Hackney FOI prototype

FOI and SAR request forms, for user testing.

---

## Setup

    git submodule update --init
    gem install jekyll
    jekyll serve

## About the Sass styles

Most of the base styling comes from [GOV.UK elements](https://github.com/alphagov/govuk_elements) and the [GOV.UK frontend toolkit](https://github.com/alphagov/govuk_frontend_toolkit), both of which are included as Git submodules, and then added to Jekyll’s Sass `load_path` by a few lines in `_config.yml`.

The custom `load_paths` trick means we don’t have to worry about the relative locations of our first-party code and the two third-party libraries, and `@import` statements between them _just work_ without crazy long paths.
