#![no_std]
//! Registro de consentimiento de Pullcord.
//!
//! Guarda, por dirección (cuenta G o contrato C) y por referencia de
//! suscripción, si el dueño de esa dirección dio o retiró su consentimiento
//! para que Pullcord la monitoree. La referencia es un hash de 32 bytes: en la
//! cadena no hay URL de webhook, chat de Telegram ni ningún dato personal.
//! Dar y retirar el consentimiento exige la firma del dueño (`require_auth`),
//! así que nadie puede suscribir la cuenta de otra persona.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, BytesN, Env,
};

/// ~30 días de ledgers (5 s por ledger) antes de renovar la vida del registro.
const TTL_THRESHOLD: u32 = 518_400;
/// ~60 días de ledgers.
const TTL_EXTEND_TO: u32 = 1_036_800;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Status {
    Active,
    Revoked,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Consent {
    pub status: Status,
    /// Ledger en que se dio o se retiró por última vez.
    pub ledger: u32,
}

#[contracttype]
enum DataKey {
    Consent(Address, BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyActive = 1,
    NotFound = 2,
    AlreadyRevoked = 3,
}

#[contractevent]
pub struct ConsentRegistered {
    #[topic]
    pub owner: Address,
    #[topic]
    pub reference: BytesN<32>,
    pub ledger: u32,
}

#[contractevent]
pub struct ConsentRevoked {
    #[topic]
    pub owner: Address,
    #[topic]
    pub reference: BytesN<32>,
    pub ledger: u32,
}

#[contract]
pub struct ConsentRegistry;

#[contractimpl]
impl ConsentRegistry {
    /// El dueño de `owner` da su consentimiento para la suscripción `reference`.
    /// Puede volver a darlo después de retirarlo.
    pub fn register(env: Env, owner: Address, reference: BytesN<32>) -> Result<(), Error> {
        owner.require_auth();
        let key = DataKey::Consent(owner.clone(), reference.clone());
        if let Some(c) = env.storage().persistent().get::<_, Consent>(&key) {
            if c.status == Status::Active {
                return Err(Error::AlreadyActive);
            }
        }
        let ledger = env.ledger().sequence();
        env.storage().persistent().set(&key, &Consent { status: Status::Active, ledger });
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        ConsentRegistered { owner, reference, ledger }.publish(&env);
        Ok(())
    }

    /// El dueño retira su consentimiento. El registro se conserva como
    /// `Revoked`: cualquiera puede verificar que se retiró y cuándo.
    pub fn revoke(env: Env, owner: Address, reference: BytesN<32>) -> Result<(), Error> {
        owner.require_auth();
        let key = DataKey::Consent(owner.clone(), reference.clone());
        let current: Consent = env.storage().persistent().get(&key).ok_or(Error::NotFound)?;
        if current.status == Status::Revoked {
            return Err(Error::AlreadyRevoked);
        }
        let ledger = env.ledger().sequence();
        env.storage().persistent().set(&key, &Consent { status: Status::Revoked, ledger });
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
        ConsentRevoked { owner, reference, ledger }.publish(&env);
        Ok(())
    }

    /// Registro completo, o `None` si nunca se dio consentimiento.
    pub fn get(env: Env, owner: Address, reference: BytesN<32>) -> Option<Consent> {
        env.storage().persistent().get(&DataKey::Consent(owner, reference))
    }

    /// `true` solo si el consentimiento está vigente.
    pub fn is_active(env: Env, owner: Address, reference: BytesN<32>) -> bool {
        matches!(
            env.storage()
                .persistent()
                .get::<_, Consent>(&DataKey::Consent(owner, reference)),
            Some(Consent { status: Status::Active, .. })
        )
    }
}

#[cfg(test)]
mod test;
