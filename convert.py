import csv
finput = open('fases.csv')
csvreader = csv.DictReader(finput)

foutput = open('fases2.csv','w')
fnames = ['tipo','valor','data','fase']
csvoutput = csv.DictWriter(foutput,fieldnames = fnames)

csvoutput.writeheader()

l = list(csvreader)
l.reverse()
for line in l:
	fase = line['Fase']
	busca = line['Busca']
	prisao = line['Prisao']
	conducao = line['Conducao']
	data = line['Data']
	csvoutput.writerow({
		'tipo' : 'busca',
		'fase' : line['Fase'],
		'valor' : line['Busca'],
		'data' : line['Data']
		})
	csvoutput.writerow({
		'tipo' : 'prisao',
		'fase' : line['Fase'],
		'valor' : line['Prisao'],
		'data' : line['Data']
		})
	csvoutput.writerow({
		'tipo' : 'conducao',
		'fase' : line['Fase'],
		'valor' : line['Conducao'],
		'data' : line['Data']
		})




