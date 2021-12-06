import React, { useEffect, useState, useCallback } from "react";
import twitterLogo from "./assets/twitter-logo.svg";
import githubLogo from "./assets/github.png";
import upVoteImage from "./assets/hand.thumbsup.circle.png";
import removeGifImage from "./assets/trash.circle.png";
// import solanaImage from "./assets/solana.circle.png";
import logo from "./assets/logo.gif";
import "./App.css";

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";

import idl from "./idl.json";
import kp from "./keypair.json";

const TWITTER_LINK = "https://twitter.com/lfsilveira";
const GITHUB_LINK = "https://github.com/lucasfernandes";

// Constants
const { SystemProgram, Keypair } = web3;
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};

const App = () => {
  console.log("PROGRAM ID = ", programID);
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

  // Check if is Phantom Wallet
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");

          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log("No gif link given!");
      return;
    }
    setInputValue("");
    console.log("Gif link: ", inputValue);
    try {
      const provider = getProvider();
      // console.log(programID);
      const program = new Program(idl, programID, provider);

      console.log(program);
      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue);

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF: ", error);
    }
  };

  const sendVote = async (uid) => {
    try {
      const provider = getProvider();
      // console.log(programID);
      const program = new Program(idl, programID, provider);

      await program.rpc.addVote(uid, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Vote successfully sent to program", uid);

      await getGifList();
    } catch (error) {
      console.log("Error sending Vote: ", error);
    }
  };

  const removeGif = async (gifInfo) => {
    if (gifInfo.userAddress.toString() !== walletAddress.toString()) {
      console.log("Only the owner of the gif can remove it");
      return;
    }

    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      await program.rpc.removeGif(gifInfo.uid, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Gif successfully removed", gifInfo.uid);
      await getGifList();
    } catch (error) {
      console.log("Error sending Vote: ", error);
    }
  };

  // const sendSol = async () => {
  //   try {
  //     const provider = getProvider();
  //     const program = new Program(idl, programID, provider);
  //     await program.rpc.sendSol(1, {
  //       accounts: {
  //         baseAccount: baseAccount.publicKey,
  //         user: provider.wallet.publicKey,
  //       },
  //     });
  //   } catch (error) {
  //     console.log("Error sending Sol");
  //   }
  // };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );

    return provider;
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.initialize({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      console.log(
        "Created a new BaseAccount w/ address: ",
        baseAccount.publicKey.toString()
      );
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error);
    }
  };

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      );
    }
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendGif();
            }}
          >
            <input
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </form>
          <div className="gif-grid">
            {/* We use index as the key instead, also, the src is now item.gifLink */}
            {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} alt="" className="item" />
                <div className="buttons-container">
                  <div className="buttons-container-inner">
                    {item.userAddress.toString() ===
                      walletAddress.toString() && (
                      <button
                        className="remove-button"
                        onClick={() => removeGif(item)}
                      >
                        <img
                          alt="Remove"
                          className="remove-image"
                          src={removeGifImage}
                        />
                      </button>
                    )}

                    {/* <button className="send-sol-button" onClick={sendSol}>
                      <img alt="Upvote" className="" src={solanaImage} />
                    </button> */}

                    <button
                      className="upvote-button"
                      onClick={() => sendVote(item.uid)}
                    >
                      <img
                        alt="Upvote"
                        className="upvote-text"
                        src={upVoteImage}
                      />
                      <span className="upvote-text">
                        {item.votes.toString()}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="user-address-text">
                  <b>Wallet:</b> {item.userAddress.toString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  const getGifList = useCallback(async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.log("Error in getGifList: ", error);
      setGifList(null);
    }
  }, []);

  // Check if is connected
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");
      getGifList();
    }
  }, [walletAddress, getGifList]);

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          <p className="header">
            <img alt="GIF Portal" className="logo" src={logo} />
          </p>
          <p className="sub-text">View your GIF collection in the metaverse</p>
          <p className="social-container">
            <a className="twitter-button" target="blank" href={TWITTER_LINK}>
              <img alt="Twitter" className="twitter-logo" src={twitterLogo} />
            </a>

            <a className="twitter-button" target="blank" href={GITHUB_LINK}>
              <img alt="Github" className="github-logo" src={githubLogo} />
            </a>
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
      </div>
    </div>
  );
};

export default App;
