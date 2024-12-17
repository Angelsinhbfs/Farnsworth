# Farnsworth
Farnsworth is a simple low power streaming service that can be run on most hardware. It is intended to be a very simple solution that lets you view your media in most browsers. It does not do any transcoding, and relies on the user to upload content via the Farnsworth-CLI that handles transcoding and uploading as well as the creation of metadata. If you want it to be available outside your network I suggest nginx proxy manager and a cloudflare tunnel. Only upload media you have a license for, I'm not responsible for what you do with the app.
## Quick start
### Prerequisites 
- Docker
- Docker compose
### Steps
1. clone the project to your working directory
2. update the docker-compose.yml with your base url if you are exposing this outside your network and set your expected user/key 
3. run ``` docker compose up --build -d ```
4. after some time your server should be available at either the baseurl from the compose
5. upload media and enjoy

There is a browser based upload, but probably dont use it, its very slow. 
