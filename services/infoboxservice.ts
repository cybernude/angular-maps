﻿import { Injectable } from '@angular/core';
import { InfoBox } from "../components/infobox";
import { IInfoWindowOptions } from "../interfaces/iinfowindowoptions";
import { ILatLong } from "../interfaces/ilatlong";

@Injectable()
export abstract class InfoBoxService {
    
    abstract AddInfoWindow(info: InfoBox): void;

    abstract Close(info: InfoBox): Promise<void>;

    abstract DeleteInfoWindow(info: InfoBox): Promise<void>;

    abstract Open(info: InfoBox, loc?: ILatLong): Promise<void>;

    abstract SetOptions(info: InfoBox, options: IInfoWindowOptions): Promise<void>;

    abstract SetPosition(info: InfoBox): Promise<void>;

}