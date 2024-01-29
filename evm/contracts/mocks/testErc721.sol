// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./ERC721A.sol";

contract TestERC721 is ERC721A {
    string private _baseTokenURI = "https://api.example.com/token/";
    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721A(_name, _symbol) {
    }

    function mint(
        address _user,
        uint256 _quantity
    ) external {
        _safeMint(_user, _quantity);
    }

    /**
    @dev set base uri for nfts, used for metadata, images, etc
    @param baseURI base uri for nfts
    */
    function setBaseURI(string memory baseURI) public {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721A) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}