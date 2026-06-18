export default function App({ Component, pageProps }) {
  return (
    <>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          background: #0D1117;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
