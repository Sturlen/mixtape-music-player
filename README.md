# MIXTAPE

![MIXTAPE Audio Cassette Logo](/mixtape_logo.svg)

Self hosted music streaming service, built on top of your own library. Stream your collection directly to any device with a web browser.

[!WARNING]
This project is still experimental. Do not expect a stable API. 

[!WARNING]
Seriously. Read above warning. 



## How to use

### 1. Install bun

Install bun from their [website](https://bun.sh?utm_source=mixtape-music-player).

You can verify your installation by running `bun -v`. if this gives you a version number, you're cleared to continue.

### 2. Get the code

Mixtape is currently only available in source code form. Docker images and compiled binaries are planned. Use one of the following methods:

Clone to code to your machine with git and navigate to the project folder:

```bash
git clone https://github.com/Sturlen/mixtape-music-player.git
cd mixtape-music-player
```

### 3. Install dependencies

```bash
bun install --production
```

### 4. Configure

Available options are listed in [/src/shared/env.ts](/src/shared/env.ts)
enviorment variables can be set through your system or by creating a `.env.production.local` file

### 5. Run

Mixtape does not currently come with any auto restart, run on startup or other functions you would expect from a long running service. If you need this you can run it with tools like pm2 or inside a docker image.

To run for production:

```bash
bun start
```

## Current Limitations

a.k.a. the todo list

- Only supports two source folders.
- Music files are downloaded in full, not streamed.
- Images and audio files are sent as is, without compression. If you lisen to you finest .flac over 4G, prepare for trouble. or a large data bill. or both.
- No user accounts or permissions.
- No custom playlists.
- No custom cassette images.
- No listen parties.

## Development

Install all packages.

```bash
bun install
```

To start a development server:

```bash
bun dev
```

Now tinker away to your hearts content. Feel free to submit back patches.
