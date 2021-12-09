# public-back

Firebase Functions + Alchemy web3

APIs in this repository can be accessed by anyone

Also, there are generateThumbnail and removeDownloadToken.

## List of APIs

### Currently using APIS
#### GET
```

URIs in contracts

/readCertificate/:address/:tokenId
/readMagicScroll/:address/:tokenId
/readJob/:address/:tokenId
/readProfile/:address

Certificate APIS

/shareCertificate/:addressC/:addressU/:tokenType
/allCertificates
/certificates/:addressU/:page
/guildCertificates/:skillName
/guildCertificates

Magic Scrolls APIS

/magicScrolls/:addressM/:addressU/:page
/magicScrolls/:addressM
/magicScrolls/inventory/:addressM/:addressU/:page

Misc APIS

/manager/:addressM
/courses

```
### Deprecated APIS
#### GET
```
/allCertificates/:address/:tokenId/:direction
/allCertificates/:address
/allMagicScrolls/:address/:tokenId/:direction
/allMagicScrolls/:address
/allJobs/:address/:tokenId/:direction
/allJobs/:address

```
## Deployment
Use this to develop your code locally

    firebase emulators:start 

Use this to deploy

    firebase deploy