Airlock
=======

Airlock is kinda like a decentralized dropbox/mega with a catalog/filterable index of files.

You will need access to a running IPFS node and Ethereum node.

The simple way is to run both nodes locally and connect to them via localhost/127.0.0.1, which Airlock defaults to.

```
geth --rpc
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs daemon
```

or if you want to have IPFS and Ethereum on a different machine on your LAN you need to enable access to their API ports..

Manually edit .ipfs/config and change the API and Gateway to listen on 0.0.0.0

```
geth --rpc --rpcaddr 0.0.0.0
```

Note:
IPFS on windows throws an error currently for the HTTPHeaders command quoted, you will need to add it manually to IPFS config file.

Release v0.4
============
* Content from Ethereum is displayed as a placeholder before found in IPFS.
* Content is added to IPFS as objects and not blocks, this enables content to be pinned.

/ipfs/QmWN5fJo7uYKmg62Y2zyBVHZwx1LLyUTcPkguzf1MULprv
http://127.0.0.1:8080/ipfs/QmWN5fJo7uYKmg62Y2zyBVHZwx1LLyUTcPkguzf1MULprv
http://ipfs.io/ipfs/QmWN5fJo7uYKmg62Y2zyBVHZwx1LLyUTcPkguzf1MULprv

![UI](/screenshots/ui.png?raw=true)