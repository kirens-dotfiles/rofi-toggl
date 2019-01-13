{ stdenv, nodejs, bash, rofi }:

stdenv.mkDerivation {
  name = "rofi-toggl";
  src = ./.;

  installPhase = ''
    mkdir -p $out/bin
    cat > $out/bin/rofi-toggl <<EOL
      #! ${bash}/bin/bash
      export NODE_PATH=$out/lib/rofi-toggl/node_modules
      ${nodejs}/bin/node $out/lib/rofi-toggl/index.js
    EOL
    chmod +x $out/bin/rofi-toggl

    mkdir -p $out/lib/rofi-toggl
    cp -r index.js node_modules $out/lib/rofi-toggl/
    substituteInPlace $out/lib/rofi-toggl/index.js \
      --replace "rofiExecutable = 'rofi'" "rofiExecutable = '${rofi}/bin/rofi'"
  '';
}
