import bcrypt

def generate_password_hash(password: str) -> str:
    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    return password_hash


if __name__ == "__main__":
    password = "Test-Stall1-123"

    password_hash = generate_password_hash(password)

    print("🔐 Plain password:")
    print(password)

    print("\n🔐 Generated bcrypt hash:")
    print(password_hash)

    print("\n✅ Verification check:")
    print(
        bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )
    )
