import React from 'react';
import Header from './Header';   // if you have a header
import Footer from './Footer';   // if you have a footer

const Layout = ({ children }) => {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
};

export default Layout;