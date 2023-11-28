Book BS (Barcode Scanner)

# Introduction

Mobile app to scan books and automatically generate MARC records for upload to an LMS. Currently integrates with Koha.

# How it works

1. [user] Load app
2. [user] Scan barcode on book
3. [app] ISBN is looked up in ISBN DB
4. [app] MARC record JSON generated using results
5. [user + app] Upload MARC record to LMS with button, optionally create item for existing record

# Getting started

1. `git clone` this repo
2. create a `.env` file in the root with variables `EXPO_PUBLIC_KOHA_APIKEY` and `EXPO_PUBLIC_ISBNDB_APIKEY`
3. run the expo server with `npx expo start` and follow instructions
