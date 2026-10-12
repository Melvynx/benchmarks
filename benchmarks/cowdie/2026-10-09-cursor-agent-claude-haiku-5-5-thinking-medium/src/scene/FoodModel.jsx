// Procedural food meshes. Each is centred on its origin.
export function FoodModel({ id }) {
  switch (id) {
    case 'apple':
      return (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[0.26, 24, 18]} />
            <meshStandardMaterial color="#ff4d5e" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <cylinderGeometry args={[0.02, 0.03, 0.14, 8]} />
            <meshStandardMaterial color="#6b4a2b" />
          </mesh>
          <mesh position={[0.12, 0.34, 0]} rotation={[0, 0, -0.5]} scale={[1, 0.45, 0.5]}>
            <sphereGeometry args={[0.13, 12, 8]} />
            <meshStandardMaterial color="#4cd964" />
          </mesh>
        </group>
      );

    case 'carrot':
      return (
        <group>
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.18, 0.7, 16]} />
            <meshStandardMaterial color="#ff9130" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.52, 0]} scale={[0.5, 1, 0.25]}>
            <sphereGeometry args={[0.2, 10, 8]} />
            <meshStandardMaterial color="#3fbf5a" />
          </mesh>
          <mesh position={[0.07, 0.5, 0.05]} scale={[0.3, 1, 0.2]}>
            <sphereGeometry args={[0.18, 10, 8]} />
            <meshStandardMaterial color="#58d46f" />
          </mesh>
        </group>
      );

    case 'cookie':
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.09, 28]} />
            <meshStandardMaterial color="#d9a35c" roughness={0.8} />
          </mesh>
          {[
            [0.12, 0.05, 0.1],
            [-0.14, 0.05, 0.05],
            [0.02, 0.05, -0.15],
            [-0.08, 0.05, -0.1],
            [0.18, 0.05, -0.1],
          ].map((p, i) => (
            <mesh key={i} position={p}>
              <sphereGeometry args={[0.04, 8, 6]} />
              <meshStandardMaterial color="#4a2c1a" />
            </mesh>
          ))}
        </group>
      );

    case 'milk':
      return (
        <group>
          <mesh>
            <cylinderGeometry args={[0.2, 0.17, 0.45, 24, 1, true]} />
            <meshStandardMaterial color="#fbfbff" side={2} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.03, 24]} />
            <meshStandardMaterial color="#fbfbff" />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.205, 0.175, 0.14, 24]} />
            <meshStandardMaterial color="#5aa9ff" />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.02, 24]} />
            <meshStandardMaterial color="#e8eef8" />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}
