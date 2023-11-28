import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
let marcData = require('./examples/marc_example.json')
let itemData = require('./examples/item_example.json');

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(true);
  const [bookData, setBookData] = useState("");

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getBarCodeScannerPermissions();
  }, []);

  const checkISBNExists = async (data) => {
    let url = "https://koha-intra.tejas.wtf/api/v1/biblios?_per_page=1000";
    return await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/marc-in-json',
        'Content-Type': 'application/marc-in-json',
        'Authorization': 'Basic ' + process.env.EXPO_PUBLIC_KOHA_APIKEY
      },
    })
    .then( res => res.json() )
    .then( body => {
      for(i in body) {
        let biblio = body[i];
        console.log(biblio);
        if(biblio["fields"][2]["020"] 
            && data == biblio["fields"][2]["020"]["subfields"][0]["a"]) {
          console.log("BIBLIO FOUND: " + data);
          let biblioNumber = biblio["fields"][7]["999"]["subfields"][0]["c"]
          let title = biblio["fields"][4]["245"]["subfields"][0]["a"]
          let author = biblio["fields"][3]["100"]["subfields"][0]["a"];
          let publisher = biblio["fields"][5]["260"]["subfields"][0]["b"];
          let publishDate = biblio["fields"][5]["260"]["subfields"][1]["c"];
          return `EXISTS/${biblioNumber}/${data}/${title}/${author}/${publisher}/${publishDate}`;
        }
      }
      return null;
    })
    .catch( err => {
      console.error(err);
      return null;
    })
  }

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    // alert(`Bar code with type ${type} and data ${data} has been scanned!`);
    // should look up isbn and add biblio+item using marc record
    let existingBiblio = await checkISBNExists(data);
    if(!existingBiblio) {
      let url = "https://api2.isbndb.com/book/" + data;
      console.log("URL is: " + url);
      fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Authorization': process.env.EXPO_PUBLIC_ISBNDB_APIKEY
        }
      })
      .then( res => res.json() )
      .then( body => {
        console.log(body);
        let author = body.book.authors[0].toUpperCase();
        let publisher = body.book.publisher.toUpperCase();
        let publishDate = body.book.date_published;
        let title = body.book.title.toUpperCase();
        setBookData(`NEW/${data}/${title}/${author}/${publisher}/${publishDate}`);
      })
      .catch( err => {
        console.error("ERROR: " + err);
      })
    } else {
      // fetch existing marc record and set bookData
      console.log("EXISTING BIBLIO: " + existingBiblio);
      setBookData(existingBiblio)
    }
  };

  const pushMARCRecord = () => {
    console.log(bookData);
    console.log(marcData);
    let url = "https://koha-intra.tejas.wtf/api/v1/biblios/"
    marcData["fields"][2]["020"]["subfields"][0]["a"] = bookData.split("/")[1]; // isbn
    marcData["fields"][4]["245"]["subfields"][0]["a"] = bookData.split("/")[2]; // title
    marcData["fields"][3]["100"]["subfields"][0]["a"] = bookData.split("/")[3]; // author
    marcData["fields"][5]["260"]["subfields"][0]["b"] = bookData.split("/")[4]; // publisher
    marcData["fields"][5]["260"]["subfields"][1]["c"] = bookData.split("/")[5]; // publish date
    console.log(marcData);
    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/marc-in-json',
        'Content-Type': 'application/marc-in-json',
        'Authorization': 'Basic ' + process.env.EXPO_PUBLIC_KOHA_APIKEY
      },
      body: JSON.stringify(marcData)
    })
    .then( res => res.json() )
    .then( body => {
      console.log(body);
      let newBookData = `EXISTS/${body.id}/${bookData.slice(4, -1)}`;
      console.log(newBookData);
      setBookData(newBookData);
    })
    .catch( err => {
      console.error(err);
    })
  }

  const createItemForMARCRecord = () => {
    console.log("Creating item for biblio record: " + bookData);
    const biblioNumber = bookData.split("/")[1]
    const isbn = bookData.split("/")[2]; // isbn
    itemData.external_id = isbn;
    itemData.biblio_id = biblioNumber;
    const now = new Date();
    console.log(now);
    itemData.acquisition_date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    itemData.last_seen_date = now.toISOString();
    itemData.replacement_price_date = itemData.acquisition_date;
    itemData.timestamp = now.toISOString();
    // itemData.effective_item_type_id = "BOOK";
    itemData.item_type_id = "BOOK";
    console.log(itemData);
    const url = `https://koha-intra.tejas.wtf/api/v1/biblios/${biblioNumber}/items/`
    console.log(url);
    fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + process.env.EXPO_PUBLIC_KOHA_APIKEY
      },
      body: JSON.stringify(itemData)
    })
    .then( res => console.log(res.json()))
    .catch( err => {
      console.error(err);
    })
  }

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.data}>
        {
          bookData.split("/").map((data, index) => (
            <Text key={index} style={styles.dataText}>{data}</Text>
          ))
        }
        {(bookData != "" && bookData.split("/")[0] == "NEW") 
          ? <Button title={'Submit MARC Record'} onPress={() => pushMARCRecord()} />
          : (bookData != "" && <Button title={'Create item for existing biblio record'} onPress={() => createItemForMARCRecord()} />)
        }
      </View>
      {
        scanned ? 
          <Button title={'Tap to Scan'} onPress={() => {
            setScanned(false);
            setBookData("");
          }} />
          :
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  data: {
    padding: 30,
  },
  dataText: {
    color: 'white',
  },
  container: {
    backgroundColor: 'black',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
});
