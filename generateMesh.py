import sys
import numpy as np
import matplotlib.pyplot as plt

def writeVerts( file , verts ):
    for v in verts:
        file.write("v ")
        for coord in v:
            file.write(str(coord) + " ")
        
        file.write("\n")


if len(sys.argv) != 3 or sys.argv[1][0] != '-' or sys.argv[2][0] != '-':
    raise Exception("Modo de uso: python3 generateMesh.py -{width} -{height}")

try:
    width = int(sys.argv[1][1:])
    depth = int(sys.argv[2][1:])
except:
    raise Exception("Modo de uso: python3 generateMesh.py -{width} -{height}")

#width = 4
#depth = 4

separacion = 0.0000001
separacionX = np.array([separacion, 0, 0])
separacionZ = np.array([0, 0, separacion])
vertices = np.array( [[np.array([i, 0, j]) for i in np.linspace(-1, 1, width)] for j in np.linspace(-1 ,1 ,depth)] )

#print(vertices)
#plt.figure(0)
#for i in vertices:
#    for j in i:
#        plt.plot(j[0], j[2], marker='.')
#plt.show()

meshFile = open("grid" + str(width) + "x" + str(depth) + ".obj", "w+")

triangulos = []
for row in range(depth - 1):
    for col in range(width - 1):
        trianguloSuperior = np.array([ 
            vertices[row][col] + separacionX / 2 + separacionZ / 2, 
            vertices[row][col + 1] - separacionX / 2  + separacionZ / 2, 
            vertices[row + 1][col] + separacionX / 2 - separacionZ / 2 
        ])
        triangulos.append(trianguloSuperior)

        writeVerts(meshFile, trianguloSuperior)

        trianguloInferior = np.array([ 
            vertices[row + 1][col] + separacionX / 2,
            vertices[row][col + 1] - separacionX / 2  + separacionZ,
            vertices[row + 1][col + 1] - separacionX / 2
        ])
        triangulos.append(trianguloInferior)

        writeVerts(meshFile, trianguloInferior)

for t in np.arange(1, len(triangulos * 3), 3):
    meshFile.write("f " + str(t) + " " + str(t + 1) + " " + str(t + 2) + "\n")

meshFile.close()
#plt.figure(0)
#for triangulo in triangulos:
#    plt.plot([x[0] for x in triangulo], [x[2] for x in triangulo], marker = '.', linestyle='None')
#
#plt.gca().invert_yaxis()
#plt.grid(True)
#plt.show()


