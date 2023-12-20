import { HasId, visitNodeAndAncestors } from "./canvasUtil"

type TestNode = HasId & { children: string[] }

describe('visitNodeAndAncestors', () => {
    const nodes: TestNode[] = [
        { id: 'ROOT', children: ['A', 'B', 'C'] },
        { id: 'A', children: ['D'] },
        { id: 'B', children: ['D'] },
        { id: 'C', children: [] },
        { id: 'D', children: ['E'] },
        { id: 'E', children: [] }
    ]

    const findNode = (id: string): TestNode | undefined => nodes.find(node => node.id === id)

    const nodeParents = (node: TestNode): TestNode[] => {
        return nodes.filter(n => n.children.includes(node.id))
    }

    it('Should traverse breadth-first', async () => {
        const visitedNodes: string[] = []

        const visitor = async (node: TestNode, depth: number) => {
            visitedNodes.push(node.id)
            return true
        }

        const startNode = findNode('E')
        if (startNode) {
            await visitNodeAndAncestors(startNode, visitor, nodeParents)
        }

        expect(visitedNodes[0]).toBe('E')
        expect(visitedNodes[1]).toBe('D')
        expect(visitedNodes[4]).toBe('ROOT')
        expect(visitedNodes.slice(2, 4)).toEqual(expect.arrayContaining(['A', 'B']))
    })

    it('should stop processing when the visitor function returns false', async () => {
        const visitedNodes: string[] = []
        const visitor = async (node: TestNode) => {
            visitedNodes.push(node.id)
            return node.id === 'E'
        }

        const startNode = findNode('E')
        if (startNode) {
            await visitNodeAndAncestors(startNode, visitor, nodeParents)
        }

        expect(visitedNodes).toEqual(['E', 'D'])
    })
})
