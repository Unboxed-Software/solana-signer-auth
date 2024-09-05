import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SignerAuthorization } from "../target/types/signer_authorization";
import { expect } from "chai";
import { createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { airdropIfRequired } from "@solana-developers/helpers";

// Set up Anchor
anchor.AnchorProvider.env().opts.commitment = "confirmed";
const provider = anchor.AnchorProvider.env();
const connection = provider.connection;
const wallet = provider.wallet as anchor.Wallet;

const program = anchor.workspace.SignerAuthorization as Program<SignerAuthorization>;

const walletFake = Keypair.generate();
const tokenAccount = Keypair.generate();

const [vaultPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault")],
  program.programId
);

let mint: PublicKey;
let withdrawDestinationFake: PublicKey;

describe("signer-authorization", () => {
  before(async () => {
    try {
      mint = await createMint(
        connection,
        wallet.payer,
        wallet.publicKey,
        null,
        0
      );

      withdrawDestinationFake = await createAccount(
        connection,
        wallet.payer,
        mint,
        walletFake.publicKey
      );

      await airdropIfRequired(connection, walletFake.publicKey, 1 * LAMPORTS_PER_SOL, 1 * LAMPORTS_PER_SOL);
    } catch (error) {
      throw new Error(`Failed to set up test: ${error.message}`);
    }
  });

  it("initializes vault", async () => {
    try {
      await program.methods
        .initializeVault()
        .accounts({
          tokenAccount: tokenAccount.publicKey,
          mint: mint,
          authority: wallet.publicKey,
        })
        .signers([tokenAccount])
        .rpc();

      await mintTo(
        connection,
        wallet.payer,
        mint,
        tokenAccount.publicKey,
        wallet.payer,
        100
      );

      const tokenAccountInfo = await getAccount(connection, tokenAccount.publicKey);
      expect(tokenAccountInfo.amount).to.equal(100n);
    } catch (error) {
      throw new Error(`Failed to initialize vault: ${error.message}`);
    }
  });
});