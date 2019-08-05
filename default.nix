{pkgs ? import <nixpkgs> {
    inherit system;
  }, system ? builtins.currentSystem, nodejs ? pkgs."nodejs-10_x"
, bash ? pkgs.bash, rofi ? pkgs.rofi }:

let
  nodeEnv = import ./node-env.nix {
    inherit (pkgs) stdenv python2 utillinux runCommand writeTextFile;
    inherit nodejs;
    libtool = if pkgs.stdenv.isDarwin then pkgs.darwin.cctools else null;
  };
  initial = import ./node-packages.nix {
    inherit (pkgs) fetchurl fetchgit;
    inherit nodeEnv;
  };
in initial // {
  package = initial.package.overrideAttrs (_: { postInstall = ''
    substituteInPlace $out/lib/node_modules/rofi-toggl/index.js \
      --replace "rofiExecutable = 'rofi'" "rofiExecutable = '${rofi}/bin/rofi'"
  ''; });
}
