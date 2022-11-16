import * as anchor from "@project-serum/anchor"
import * as spl from "@solana/spl-token"
import { Program } from "@project-serum/anchor"
import { SignerCheck } from "../target/types/signer_check"
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey"

describe("signer-check", () => {
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.SignerCheck as Program<SignerCheck>
  const connection = anchor.getProvider().connection
  const wallet = anchor.workspace.SignerCheck.provider.wallet
  const walletFake = anchor.web3.Keypair.generate()
  const tokenAccount = anchor.web3.Keypair.generate()

  const [vaultPDA] = findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  )

  let mint: anchor.web3.PublicKey
  let withdrawDestinationFake: anchor.web3.PublicKey

  before(async () => {
    mint = await spl.createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      1
    )

    withdrawDestinationFake = await spl.createAccount(
      connection,
      wallet.payer,
      mint,
      walletFake.publicKey
    )

    await connection.confirmTransaction(
      await connection.requestAirdrop(
        walletFake.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    )
  })

  it("Initialize Vault", async () => {
    await program.methods
      .initializeVault()
      .accounts({
        vault: vaultPDA,
        tokenAccount: tokenAccount.publicKey,
        mint: mint,
        authority: wallet.publicKey,
      })
      .signers([tokenAccount])
      .rpc()

    await spl.mintTo(
      connection,
      wallet.payer,
      mint,
      tokenAccount.publicKey,
      wallet.payer,
      100
    )
  })

  it("Withdraw", async () => {
    const vault = await program.account.vault.fetch(vaultPDA)

    const tokenBefore = await spl.getAccount(connection, tokenAccount.publicKey)
    console.log(tokenBefore.amount)

    const tx = await program.methods
      .withdraw()
      .accounts({
        vault: vaultPDA,
        tokenAccount: vault.tokenAccount,
        withdrawDestination: withdrawDestinationFake,
        authority: wallet.publicKey,
      })
      .transaction()

    await anchor.web3.sendAndConfirmTransaction(connection, tx, [walletFake])

    const tokenAfter = await spl.getAccount(connection, tokenAccount.publicKey)
    console.log(tokenAfter.amount)
  })
})
