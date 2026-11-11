import { Handle, Position } from 'reactflow';

const SIDES = [
  { pos: Position.Top, key: 'top' },
  { pos: Position.Bottom, key: 'bottom' },
  { pos: Position.Left, key: 'left' },
  { pos: Position.Right, key: 'right' },
] as const;

/** Точки подключения со всех сторон (source + target на каждой стороне) */
export function BlueprintHandles() {
  return (
    <>
      {SIDES.map(({ pos, key }) => (
        <span key={key}>
          <Handle type="target" position={pos} id={`${key}-target`} className="bp-handle" />
          <Handle type="source" position={pos} id={`${key}-source`} className="bp-handle" />
        </span>
      ))}
    </>
  );
}
