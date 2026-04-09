import { useState } from 'react';
import { orgUnitLevels, buildTree, getDescendants } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import './OrgUnitTree.css';

/**
 * OrgUnitTree Component
 *
 * Displays the organizational hierarchy as an expandable tree.
 * Demonstrates the scope matching logic:
 * - Each node shows its level
 * - Expanding a node shows its descendants (scope)
 */
function OrgUnitTree() {
  const { orgUnits } = useAuth();
  const tree = buildTree(orgUnits);

  return (
    <div className="org-unit-tree">
      <h2>Organisationsstruktur</h2>
      <p className="scope-info">
        <strong>Scope-Logik:</strong> Ein Organizer verwaltet seine zugewiesene Einheit
        und alle darunterliegenden Einheiten (Nachfahren).
      </p>
      <div className="tree-container">
        {tree.map(node => (
          <TreeNode key={node.id} node={node} level={0} allUnits={orgUnits} />
        ))}
      </div>
      <div className="legend">
        <h4>Hierarchie-Ebenen:</h4>
        <ul>
          {Object.entries(orgUnitLevels)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([key, value]) => (
              <li key={key}>
                <span className={`level-badge level-${key}`}>{value.name}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

function TreeNode({ node, level, allUnits }) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [showScope, setShowScope] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const levelInfo = orgUnitLevels[node.level];
  const descendants = getDescendants(node.id, allUnits);

  const toggleExpand = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const toggleScope = (e) => {
    e.stopPropagation();
    setShowScope(!showScope);
  };

  return (
    <div className="tree-node">
      <div
        className={`node-content ${hasChildren ? 'has-children' : ''}`}
        style={{ paddingLeft: `${level * 20}px` }}
      >
        <span className="expand-icon" onClick={toggleExpand}>
          {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
        </span>
        <span className={`level-badge level-${node.level}`}>
          {levelInfo?.name}
        </span>
        <span className="node-name">{node.name}</span>
        <button
          className="scope-btn"
          onClick={toggleScope}
          title="Scope anzeigen (alle Nachfahren)"
        >
          Scope ({descendants.length})
        </button>
      </div>

      {showScope && (
        <div className="scope-popup" style={{ marginLeft: `${level * 20 + 40}px` }}>
          <strong>Scope von "{node.name}":</strong>
          <ul>
            {descendants.map(d => (
              <li key={d.id}>
                <span className={`level-badge level-${d.level}`}>
                  {orgUnitLevels[d.level]?.name}
                </span>
                {d.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isExpanded && hasChildren && (
        <div className="children">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} allUnits={allUnits} />
          ))}
        </div>
      )}
    </div>
  );
}

export default OrgUnitTree;
