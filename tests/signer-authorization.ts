import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SignerAuthorization } from "../target/types/signer_authorization";
import { expect } from "chai";
import {
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { airdropIfRequired } from "@solana-developers/helpers";

describe("Signer Authorization", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .SignerAuthorization as Program<SignerAuthorization>;
  const connection = provider.connection;
  const walletAuthority = provider.wallet as anchor.Wallet;

  const unauthorizedWallet = Keypair.generate();
  const vaultTokenAccount = Keypair.generate();

  const VAULT_SEED = "vault";
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED)],
    program.programId
  );

  let tokenMint: PublicKey;
  let unauthorizedWithdrawDestination: PublicKey;

  const INITIAL_AIRDROP_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
  const MINIMUM_BALANCE_FOR_RENT_EXEMPTION = 0.5 * LAMPORTS_PER_SOL;
  const INITIAL_TOKEN_AMOUNT = 100;

  before(async () => {
    try {
      tokenMint = await createMint(
        connection,
        walletAuthority.payer,
        walletAuthority.publicKey,
        null,
        0
      );

      unauthorizedWithdrawDestination = await createAccount(
        connection,
        walletAuthority.payer,
        tokenMint,
        unauthorizedWallet.publicKey
      );

      await airdropIfRequired(
        connection,
        unauthorizedWallet.publicKey,
        INITIAL_AIRDROP_AMOUNT,
        MINIMUM_BALANCE_FOR_RENT_EXEMPTION
      );
    } catch (error) {
      console.error("Test setup failed:", error);
      throw error;
    }
  });

  it("initializes vault and mints tokens", async () => {
    try {
      await program.methods
        .initializeVault()
        .accounts({
          tokenAccount: vaultTokenAccount.publicKey,
          mint: tokenMint,
          authority: walletAuthority.publicKey,
        })
        .signers([vaultTokenAccount])
        .rpc();

      await mintTo(
        connection,
        walletAuthority.payer,
        tokenMint,
        vaultTokenAccount.publicKey,
        walletAuthority.payer,
        INITIAL_TOKEN_AMOUNT
      );

      const tokenAccountInfo = await getAccount(
        connection,
        vaultTokenAccount.publicKey
      );
      expect(Number(tokenAccountInfo.amount)).to.equal(INITIAL_TOKEN_AMOUNT);
    } catch (error) {
      console.error("Vault initialization failed:", error);
      throw error;
    }
  });
});
