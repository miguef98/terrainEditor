import numpy as np

lightMatrix = [-0.2709524415045375, -0.91665303754348, -1.436084932498537, -0.8339328476572203, 0, 1.4624188652187202, -0.9227275180010801, -0.5358267949789967, 1.7107263879541725, -0.1451835783231104, -0.2274535082922805, -0.13208198734443577, 0, 0, 1.7363896848137537, 3]
lightMatrix = np.array([ [ lightMatrix[i], lightMatrix[i+4], lightMatrix[i+8], lightMatrix[i+12]] for i in range(4) ])


maxZ = -np.inf
minZ = np.inf
for x in np.arange(-1,1,0.01):
    for y in np.arange(-1,1,0.01):
        for z in np.arange(-1,1,0.01):
            lightcoords = np.dot(lightMatrix, np.array([x, y, z, 1]))
            if lightcoords[2] < minZ:
                minZ = lightcoords[2]
            if lightcoords[2] > maxZ:
                maxZ = lightcoords[2]


print("minimo Z: ", minZ)
print("maximo Z: ", maxZ)
