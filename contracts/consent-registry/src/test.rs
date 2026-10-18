#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

fn setup() -> (Env, ConsentRegistryClient<'static>, Address, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(ConsentRegistry, ());
    let client = ConsentRegistryClient::new(&env, &id);
    let owner = Address::generate(&env);
    let reference = BytesN::from_array(&env, &[7u8; 32]);
    (env, client, owner, reference)
}

#[test]
fn register_then_active() {
    let (_env, c, owner, r) = setup();
    assert!(!c.is_active(&owner, &r));
    assert_eq!(c.get(&owner, &r), None);
    c.register(&owner, &r);
    assert!(c.is_active(&owner, &r));
    assert_eq!(c.get(&owner, &r).unwrap().status, Status::Active);
}

#[test]
fn revoke_keeps_a_verifiable_record() {
    let (_env, c, owner, r) = setup();
    c.register(&owner, &r);
    c.revoke(&owner, &r);
    assert!(!c.is_active(&owner, &r));
    assert_eq!(c.get(&owner, &r).unwrap().status, Status::Revoked);
}

#[test]
fn can_register_again_after_revoking() {
    let (_env, c, owner, r) = setup();
    c.register(&owner, &r);
    c.revoke(&owner, &r);
    c.register(&owner, &r);
    assert!(c.is_active(&owner, &r));
}

#[test]
fn registering_twice_fails() {
    let (_env, c, owner, r) = setup();
    c.register(&owner, &r);
    assert_eq!(c.try_register(&owner, &r), Err(Ok(Error::AlreadyActive)));
}

#[test]
fn revoking_unknown_or_twice_fails() {
    let (_env, c, owner, r) = setup();
    assert_eq!(c.try_revoke(&owner, &r), Err(Ok(Error::NotFound)));
    c.register(&owner, &r);
    c.revoke(&owner, &r);
    assert_eq!(c.try_revoke(&owner, &r), Err(Ok(Error::AlreadyRevoked)));
}

#[test]
fn consent_is_per_owner_and_per_reference() {
    let (env, c, owner, r) = setup();
    let other = Address::generate(&env);
    let r2 = BytesN::from_array(&env, &[9u8; 32]);
    c.register(&owner, &r);
    assert!(!c.is_active(&other, &r));
    assert!(!c.is_active(&owner, &r2));
}

#[test]
fn the_owner_must_sign() {
    // Sin firma del dueño no se puede registrar ni retirar: nadie suscribe la
    // cuenta de otra persona.
    let env = Env::default();
    let id = env.register(ConsentRegistry, ());
    let c = ConsentRegistryClient::new(&env, &id);
    let owner = Address::generate(&env);
    let r = BytesN::from_array(&env, &[1u8; 32]);
    assert!(c.try_register(&owner, &r).is_err());
    assert!(c.try_revoke(&owner, &r).is_err());
    assert!(!c.is_active(&owner, &r));
}

#[test]
fn the_signature_required_is_the_owners() {
    let (env, c, owner, r) = setup();
    c.register(&owner, &r);
    let auths = env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, owner);
}
