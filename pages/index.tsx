import { useEffect } from 'react';
import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Index.module.css'

const Home: NextPage = () => {
  useEffect(() => {
    let seed = Math.floor(Math.random() * 4294967295).toString(16);

    while (seed.length < 8) {
      seed = "0" + seed;
    }

    Promise.all([
        fetch(`/api/maze-js?seed=${seed}`),
        fetch(`/api/maze-c?seed=${seed}`)
    ]).then(([ jsResponse, wasmResponse ]) => {
        Promise.all([
            jsResponse.text(),
            wasmResponse.text()
        ]).then(([ jsSvg, wasmSvg ]) => {
            document.querySelector("#mazeJs").innerHTML = jsSvg;
            document.querySelector("#mazeWasm").innerHTML = wasmSvg;
        });
    });

    document.querySelector("#mazeNumber").innerHTML = `0x${seed}`;
  });

  return (
    <div className={styles.container}>
      <Head>
        <title>Wasm on the Edge</title>
        <meta name="description" content="Maze generator and solver in JavaScript and Wasm" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:creator" content="@ethomson" />
        <meta name="twitter:title" content="Wasm on the Edge" />
        <meta name="twitter:description" content="Maze solver in JavaScript at Wasm Vercel Edge Functions" />
        <meta name="twitter:image" content="https://wasm-on-the-edge.vercel.app/screenshot.png" />
        <meta name="og:title" content="Wasm on the Edge" />
        <meta name="og:description" content="Maze solver in JavaScript at Wasm Vercel Edge Functions" />
        <meta name="og:image" content="https://wasm-on-the-edge.vercel.app/screenshot.png" />
      </Head>

      <main className={styles.main}>
        <h1>Wasm on the edge!</h1>

        <div id="mazeContainer" className={styles.mazeContainer}>
          <div className={styles.mazeWithTitle}>
            <div className={styles.mazeTitle}>
              JavaScript &mdash; 81ms average
            </div>

            <div id="mazeJs" className={styles.maze} />
          </div>

          <div className={styles.mazeWithTitle}>
            <div className={styles.mazeTitle}>
              Wasm (C) &mdash; 36ms average
            </div>

            <div id="mazeWasm" className={styles.maze} />
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={styles.company}>
          <a
            href="https://vercel.com?utm_source=wasm-on-the-edge&utm_medium=default-template&utm_campaign=wasm-on-the-edge"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.logo}>
              <svg width="71" height="16" viewBox="0 0 71 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M35.26 4C32.5 4 30.51 5.8 30.51 8.5C30.51 11.2 32.75 13 35.51 13C37.1775 13 38.6475 12.34 39.5575 11.2275L37.645 10.1225C37.14 10.675 36.3725 10.9975 35.51 10.9975C34.3125 10.9975 33.295 10.3725 32.9175 9.3725H39.9225C39.9775 9.0925 40.01 8.8025 40.01 8.4975C40.01 5.8 38.02 4 35.26 4ZM32.895 7.625C33.2075 6.6275 34.0625 6 35.2575 6C36.455 6 37.31 6.6275 37.62 7.625H32.895ZM62.18 4C59.42 4 57.43 5.8 57.43 8.5C57.43 11.2 59.67 13 62.43 13C64.0975 13 65.5675 12.34 66.4775 11.2275L64.565 10.1225C64.06 10.675 63.2925 10.9975 62.43 10.9975C61.2325 10.9975 60.215 10.3725 59.8375 9.3725H66.8425C66.8975 9.0925 66.93 8.8025 66.93 8.4975C66.93 5.8 64.94 4 62.18 4ZM59.8175 7.625C60.13 6.6275 60.985 6 62.18 6C63.3775 6 64.2325 6.6275 64.5425 7.625H59.8175ZM50.06 8.5C50.06 10 51.04 11 52.56 11C53.59 11 54.3625 10.5325 54.76 9.77L56.68 10.8775C55.885 12.2025 54.395 13 52.56 13C49.7975 13 47.81 11.2 47.81 8.5C47.81 5.8 49.8 4 52.56 4C54.395 4 55.8825 4.7975 56.68 6.1225L54.76 7.23C54.3625 6.4675 53.59 6 52.56 6C51.0425 6 50.06 7 50.06 8.5ZM70.68 1.25V12.75H68.43V1.25H70.68ZM9.2375 0L18.475 16H0L9.2375 0ZM32.3325 1.25L25.405 13.25L18.4775 1.25H21.075L25.405 8.75L29.735 1.25H32.3325ZM47.06 4.25V6.6725C46.81 6.6 46.545 6.55 46.26 6.55C44.8075 6.55 43.76 7.55 43.76 9.05V12.75H41.51V4.25H43.76V6.55C43.76 5.28 45.2375 4.25 47.06 4.25Z" fill="var(--fg)"/></svg>
            </span>
          </a>
        </div>

        <div className={styles.metadata}>
          <div>
            Built with <a href="https://nextjs.org">Next.js</a> on <a href="https://vercel.com/edge">Vercel Edge Functions</a>
          </div>

          <div className={styles.mazeMetadata}>
            Maze number: <span id="mazeNumber" className={styles.mazeNumber}>generating</span>
          </div>
        </div>

        <div className={styles.source}>
          <a
            href="https://github.com/ethomson/next-maze"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.50583 0 12.3035C0 17.7478 3.435 22.3463 8.205 23.9765C8.805 24.0842 9.03 23.715 9.03 23.3921C9.03 23.0999 9.015 22.131 9.015 21.1005C6 21.6696 5.22 20.347 4.98 19.6549C4.845 19.3012 4.26 18.2092 3.75 17.917C3.33 17.6863 2.73 17.1173 3.735 17.1019C4.68 17.0865 5.355 17.9939 5.58 18.363C6.66 20.2239 8.385 19.701 9.075 19.3781C9.18 18.5783 9.495 18.04 9.84 17.7325C7.17 17.4249 4.38 16.3637 4.38 11.6576C4.38 10.3196 4.845 9.21226 5.61 8.35102C5.49 8.04343 5.07 6.78232 5.73 5.09058C5.73 5.09058 6.735 4.76762 9.03 6.3517C9.99 6.07487 11.01 5.93645 12.03 5.93645C13.05 5.93645 14.07 6.07487 15.03 6.3517C17.325 4.75224 18.33 5.09058 18.33 5.09058C18.99 6.78232 18.57 8.04343 18.45 8.35102C19.215 9.21226 19.68 10.3042 19.68 11.6576C19.68 16.3791 16.875 17.4249 14.205 17.7325C14.64 18.1169 15.015 18.8552 15.015 20.0086C15.015 21.6542 15 22.9768 15 23.3921C15 23.715 15.225 24.0995 15.825 23.9765C18.2072 23.1519 20.2773 21.5822 21.7438 19.4882C23.2103 17.3942 23.9994 14.8814 24 12.3035C24 5.50583 18.63 0 12 0Z" fill="var(--fg)"></path></svg>

            Source
          </a>
        </div>
      </footer>
    </div>
  )
}

export default Home
