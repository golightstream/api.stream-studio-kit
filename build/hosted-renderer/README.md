# Hosted Renderer
This is a simple Cloudflare worker that hosts each version of the sceneless renderer.  

- A worker is deployed which acts as a simple proxy, serving files from the KV storage.
- Every time a new release of Studio Kit is tagged, the renderer will be uploaded to the KV store against that version
- Every build to main will be uploaded as `latest`.