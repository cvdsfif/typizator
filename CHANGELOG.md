# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## 4.4.1 - 2024-12-24

## 4.4.0 - 2024-12-24
Literal types now have type enforcement without requiring the use of generic parameters.

## 4.3.0 - 2024-12-24
Recursive object schemas. See `recursiveS`.

## 4.2.1 - 2024-12-23
Mistype in the changelog corrected

## 4.2.0 - 2024-12-23
The `.extend` method is now applicable to `.notNull` and `.optional` schemas.

## 4.1.0 - 2024-12-12
`hidden` field added to the API and function definitions. Additional checks added to the API creation to ensure that only valid fields are allowed.

## 4.0.0 - 2024-12-07
Extendable types and literal schemas added. See `extend` method for `objectS` and the `literalS` schema.

## 3.2.1 - 2024-05-11
Minor problem fixed in exception reporting for complex object schemas

## 3.2.0 - 2024-04-29
Dictionary schemas are now available, the schema declaration is `dictionaryS`

### Changed
- Discriminator flags on `notNull` and `optional` modificators are now called `notNullFlag` and `optionalFlag`

## 3.1.0 - 2024-04-25
Optimised `.notNull` and `.optional` attributes management, removed circular dependencies and converted them to lazy-loaded getters. Cached `objectS` and `arrayS` instances to refer to the same instance for identical types. They are now exported as interfaces.

### Added
- `getSchemaSignature` function that returns the schema string representation

### Fixed
- `.byDefault(....).optional` now correctly replaces undefined values by the result of default resolution

## 3.1.0-beta.3 - 2024-04-22

## 3.1.0-beta.2 - 2024-04-22

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
