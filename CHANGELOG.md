# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 3.1.0-beta.1 - 2024-04-22

## 3.1.0-beta.0 - 2024-04-21

## 3.0.1 - 2024-03-28
Minor documentation update

## 3.0.0 - 2024-03-28
Migrated to Typescript 5.4

### Removed
- `members` field for the API metadata. All its functionalities are in `implementation` in a more type-safe way

## 2.4.1 - 2024-03-27
### Added
- Primitive schema types exported

### Changed
- Reserved words explicitly forbidden as method or sub-apis names for `apiS`

## 2.4.0 - 2024-03-17
### Added
- Access to metadata for the api metadata `implementation`'s members

### Changed
- Api metadata's `members` map deprecated and will be removed in the next major version. All its data is now in `implementation`

## 2.3.0 - 2024-03-13
Names and paths for the `apiS` metadata. Documentation for `apiS` part of the library

## 2.2.0 - 2024-03-07
Memory management optimized: unnecessary map removed from the object metadata.
`ObjectMetadata.fields` behaviour updated.

## 2.0.2 - 2024-03-02

## 2.0.1 - 2024-03-02

## 2.0.0 - 2024-03-02
Library documented

## 1.0.0-beta.45 - 2024-02-29
Moving the library to the automate release workflow

### Added
- ./github/workflows/release_package.yml
