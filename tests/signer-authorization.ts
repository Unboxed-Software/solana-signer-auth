import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { SignerAuthorization } from "../target/types/signer_authorization";
import { expect } from "chai";

describe("signer-authorization", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace
    .SignerAuthorization as Program<SignerAuthorization>;
  const connection = anchor.getProvider().connection;
  const wallet = anchor.workspace.SignerAuthorization.provider.wallet;
  const walletFake = anchor.web3.Keypair.generate();
  const tokenAccount = anchor.web3.Keypair.generate();
  let mint: anchor.web3.PublicKey;
  let withdrawDestinationFake: anchor.web3.PublicKey;

  before(async () => {
    mint = await spl.createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      0
    );

    withdrawDestinationFake = await spl.createAccount(
      connection,
      wallet.payer,
      mint,
      walletFake.publicKey
    );

    const airdropSignature = await connection.requestAirdrop(
      walletFake.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );

    const latestBlockHash = await connection.getLatestBlockhash();

    await connection.confirmTransaction(
      {
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: airdropSignature,
      },
      "confirmed"
    );
  });

  it("initializeVault should be success", async () => {
    await program.methods
      .initializeVault()
      .accounts({
        tokenAccount: tokenAccount.publicKey,
        mint: mint,
        authority: wallet.publicKey,
      })
      .signers([tokenAccount])
      .rpc();

    await spl.mintTo(
      connection,
      wallet.payer,
      mint,
      tokenAccount.publicKey,
      wallet.payer,
      100
    );

    const balance = await connection.getTokenAccountBalance(
      tokenAccount.publicKey
    );
    expect(balance.value.uiAmount).to.eq(100);
  });
});
