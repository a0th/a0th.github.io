# coding: utf-8
import pandas as p
d = p.read_csv('mycsv.csv')
print d.loc[d['Partido'] == 'PMDB',"Nome"].count()
# for el in d['Empresa'].unique(): print el