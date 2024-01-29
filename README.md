# nexa-cat backend

## Overview

NEXA is a chain agnostic token standard, enabling tokens & NFTs to be native and compatible across different blockchains.

## Features

- Deploy new token/nft
- Deploy existing token/nft
- Bridge token/nft

## Getting Started

### Installation

1. Clone the repository:
```bash
https://github.com/NEXA-NETWORK/nexa-backend.git
```
2. Navigate to the evm directory:
3. Install dependencies:
```bash
npm install
```
4. Navigate to the sdk directory:
5. Install dependencies:
```bash
npm install
```

6. Start the development server:
```bash
npm start run:dev
```
The application will be accessible at http://localhost:4000 by default.

## Usage

### Setup your env

7. Navigate to your evm folder and setup your env as follows:
```bash
PRIVATE_KEY="your private key"
ETHERSCAN_API_KEY="your etherscan api key"
BSCSCAN_API_KEY="your bscscan api key"
POLYGONSCAN_API_KEY="your polygon scan api key"
SNOWSCAN_API_KEY="your snowscan api key"
FTMSCAN_API_KEY="your ftmscan api key"
COINMARKETCAP_API_KEY="your coinmarketcap api key"
INFURA_KEY="your infura key"
REPORT_GAS=
```
8. Navigate to your sdk folder and setup your env as follows:
```bash
PORT=4000
MONGODB_URI_DEV="your mongodb url"
HOT_WALLET_PRIVATE_KEY="your private key"
IS_CRON_JOB_TO_BE_ACTIVE=1
IS_MAINNET=0
```
