Book BS (Barcode Scanner)

# Introduction

Mobile app to scan books and automatically generate MARC records for upload to an LMS. Currently integrates with Koha.

# How it works

1. [user] Load app
2. [user] Scan barcode on book
3. [app] ISBN is looked up in ISBN DB
4. [app] MARC record JSON generated using results
5. [user] Upload MARC record to LMS with button